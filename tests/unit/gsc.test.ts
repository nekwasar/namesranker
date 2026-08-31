import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
// crypto.ts derives its key from NEXTAUTH_SECRET; ensure it exists for this file.
process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET ?? "x".repeat(32);
import { encryptOauthToken, decryptOauthToken } from "@/lib/gsc/crypto";
import { getLinks, deleteLink, saveLink, refreshAnalytics } from "@/lib/gsc/links";
import * as google from "@/lib/gsc/google";
import { fetchSearchAnalytics } from "@/lib/gsc/google";
import { ClaimError } from "@/lib/claims/claim";

const mocks = vi.hoisted(() => {
  const prisma = {
    user: { findUnique: vi.fn() },
    page: { findFirst: vi.fn(), findMany: vi.fn() },
    searchConsoleLink: {
      findMany: vi.fn(),
      upsert: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
    },
  };
  const refreshAccessToken = vi.fn();
  return { prisma, refreshAccessToken };
});

vi.mock("@/lib/db", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/gsc/google", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/gsc/google")>();
  return {
    ...actual,
    refreshAccessToken: mocks.refreshAccessToken,
    fetchSearchAnalytics: actual.fetchSearchAnalytics, // real impl; we spy in links tests
    decryptToken: actual.decryptToken,
  };
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.prisma.user.findUnique.mockResolvedValue({ id: "u1", plan: "PREMIUM" });
  mocks.prisma.page.findFirst.mockResolvedValue({ id: "p1", path: "alex-morgan" });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("token encryption at rest (spec §4.5)", () => {
  it("round-trips an OAuth refresh token", () => {
    const token = "ya29.refreshTokenWith.junk";
    const e = encryptOauthToken(token);
    expect(e).not.toContain(token);
    expect(e.startsWith("v1:")).toBe(true);
    expect(decryptOauthToken(e)).toBe(token);
  });

  it("produces unique ciphertext for identical plaintext (random IV)", () => {
    const token = "same-token";
    expect(encryptOauthToken(token)).not.toBe(encryptOauthToken(token));
  });

  it("fails to decrypt tampered ciphertext", () => {
    const encrypted = encryptOauthToken("secret");
    const [v, iv, tag, data] = encrypted.split(":");
    const tampered = Buffer.from(data, "base64");
    tampered[0] ^= 0xff;
    const bad = `v1:${iv}:${tag}:${tampered.toString("base64")}`;
    expect(() => decryptOauthToken(bad)).toThrow();
  });
});

describe("getLinks", () => {
  it("returns only links owned by the user's pages", async () => {
    mocks.prisma.page.findMany.mockResolvedValue([{ id: "p1" }]);
    mocks.prisma.searchConsoleLink.findMany.mockResolvedValue([
      {
        id: "c1",
        pageId: "p1",
        propertyUrl: "sc-domain:namesranker.com",
        lastImportAt: new Date("2026-08-01T00:00:00Z"),
        page: { path: "alex-morgan", title: "Alex Morgan" },
      },
      {
        id: "c2",
        pageId: "p999", // someone else's page
        propertyUrl: "sc-domain:other.com",
        lastImportAt: null,
        page: { path: "x", title: "X" },
      },
    ]);

    const links = await getLinks("u1");
    expect(links).toHaveLength(1);
    expect(links[0]).toMatchObject({ pagePath: "alex-morgan", pageId: "p1" });
    expect(links[0].lastImportAt).toBe("2026-08-01T00:00:00.000Z");
  });
});

describe("saveLink premium gating", () => {
  it("stores an encrypted token via upsert for a premium owner", async () => {
    await saveLink({
      userId: "u1",
      pageId: "p1",
      propertyUrl: "sc-domain:namesranker.com",
      refreshToken: "plaintext-refresh",
    });
    const upsertCall = mocks.prisma.searchConsoleLink.upsert.mock.calls[0][0];
    expect(upsertCall.where).toEqual({ pageId: "p1" });
    expect(upsertCall.create.oauthRefreshToken).toMatch(/^v1:/);
    expect(upsertCall.create.oauthRefreshToken).not.toContain("plaintext-refresh");
  });

  it("rejects free users", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({ id: "u1", plan: "FREE" });
    await expect(
      saveLink({ userId: "u1", pageId: "p1", propertyUrl: "x", refreshToken: "y" })
    ).rejects.toBeInstanceOf(ClaimError);
  });

  it("rejects non-owner pages", async () => {
    mocks.prisma.page.findFirst.mockResolvedValue(null);
    await expect(
      saveLink({ userId: "u1", pageId: "p-other", propertyUrl: "x", refreshToken: "y" })
    ).rejects.toThrow("not_found");
  });
});

describe("deleteLink", () => {
  it("only deletes links owned by the user", async () => {
    mocks.prisma.searchConsoleLink.findFirst.mockResolvedValue({ id: "c1" });
    await deleteLink("u1", "c1");
    expect(mocks.prisma.searchConsoleLink.delete).toHaveBeenCalledWith({ where: { id: "c1" } });

    mocks.prisma.searchConsoleLink.findFirst.mockResolvedValue(null);
    await expect(deleteLink("u1", "c9")).rejects.toThrow("not_found");
  });
});

describe("refreshAnalytics", () => {
  it("decrypts the token, refreshes access, and updates lastImportAt", async () => {
    mocks.prisma.searchConsoleLink.findFirst.mockResolvedValue({
      id: "c1",
      pageId: "p1",
      propertyUrl: "sc-domain:namesranker.com",
      oauthRefreshToken: encryptOauthToken("refresh-token"),
    });
    mocks.refreshAccessToken.mockResolvedValue("new-access");
    vi.spyOn(google, "fetchSearchAnalytics").mockResolvedValue({
      rows: [{ clicks: 1, impressions: 5, ctr: 0.2, position: 3, query: "alex" }],
      totals: { clicks: 1, impressions: 5, ctr: 0.2, position: 3 },
      window: { startDate: "2026-06-01", endDate: "2026-08-31" },
    });

    const result = await refreshAnalytics("u1", "c1");
    expect(mocks.refreshAccessToken).toHaveBeenCalledWith("refresh-token");
    expect(google.fetchSearchAnalytics).toHaveBeenCalledWith(
      expect.objectContaining({ siteUrl: "sc-domain:namesranker.com", accessToken: "new-access" })
    );
    expect(mocks.prisma.searchConsoleLink.update).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: { lastImportAt: expect.any(Date) },
    });
    expect(result.totals.clicks).toBe(1);
  });

  it("propagates search_console_auth_failed so the UI prompts reconnect", async () => {
    mocks.prisma.searchConsoleLink.findFirst.mockResolvedValue({
      id: "c1",
      pageId: "p1",
      propertyUrl: "sc-domain:namesranker.com",
      oauthRefreshToken: encryptOauthToken("refresh-token"),
    });
    mocks.refreshAccessToken.mockResolvedValue("new-access");
    vi.spyOn(google, "fetchSearchAnalytics").mockRejectedValue(
      Object.assign(new Error("auth"), { code: "search_console_auth_failed" })
    );

    await expect(refreshAnalytics("u1", "c1")).rejects.toMatchObject({
      code: "search_console_auth_failed",
    });
  });
});

describe("fetchSearchAnalytics mapping", () => {
  it("maps raw API rows into totals + rows (real fetch via mocked global fetch)", async () => {
    const fakeResponse = {
      ok: true,
      status: 200,
      json: async () => ({
        rows: [
          { clicks: 10, impressions: 50, ctr: 0.2, position: 2.5, query: "alex morgan" },
          { clicks: 5, impressions: 25, ctr: 0.2, position: 5, query: "alex morgan designer" },
        ],
      }),
    };
    const fetchMock = vi.fn().mockResolvedValue(fakeResponse);
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchSearchAnalytics({
      siteUrl: "sc-domain:namesranker.com",
      accessToken: "tok",
      startDate: "2026-06-01",
      endDate: "2026-08-31",
      dimension: "query",
    });

    expect(result.rows).toHaveLength(2);
    expect(result.totals.clicks).toBe(15);
    expect(result.totals.impressions).toBe(75);
    expect(result.totals.ctr).toBeCloseTo(0.2);
    expect(result.totals.position).toBeCloseTo(3.75);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/searchAnalytics/query"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer tok" }),
      })
    );
    vi.unstubAllGlobals();
  });
});
