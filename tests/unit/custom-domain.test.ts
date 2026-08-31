import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  normalizeDomain,
  isValidHostname,
  isReservedDomain,
  verificationTxtName,
  setCustomDomain,
  verifyCustomDomain,
  removeCustomDomain,
  resolvePageByHost,
} from "@/lib/custom-domain";
import { ClaimError } from "@/lib/claims/claim";

const mocks = vi.hoisted(() => {
  const prisma = {
    user: { findUnique: vi.fn() },
    page: { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  };
  const revalidatePublicPages = vi.fn();
  const resolveTxt = vi.fn();
  return { prisma, revalidatePublicPages, resolveTxt };
});

vi.mock("@/lib/db", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/revalidate", () => ({ revalidatePublicPages: mocks.revalidatePublicPages }));
vi.mock("node:dns/promises", () => ({ resolveTxt: mocks.resolveTxt }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.revalidatePublicPages.mockResolvedValue(undefined);
  mocks.prisma.user.findUnique.mockResolvedValue({ id: "u1", plan: "PREMIUM" });
  mocks.prisma.page.findFirst.mockResolvedValue({ id: "p1", path: "alex-morgan" });
  mocks.prisma.page.findUnique.mockResolvedValue(null);
  mocks.prisma.page.update.mockResolvedValue({ id: "p1" });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("normalizeDomain", () => {
  it("strips scheme, port, path, and www", () => {
    expect(normalizeDomain("https://MyName.com:443/portfolio?x=1")).toBe("myname.com");
    expect(normalizeDomain("www.example.com")).toBe("example.com");
    expect(normalizeDomain("  EXAMPLE.com ")).toBe("example.com");
  });

  it("returns null for empty input", () => {
    expect(normalizeDomain("")).toBeNull();
    expect(normalizeDomain("   ")).toBeNull();
  });
});

describe("isValidHostname", () => {
  it("accepts real hostnames", () => {
    expect(isValidHostname("myname.com")).toBe(true);
    expect(isValidHostname("sub.myname.com")).toBe(true);
    expect(isValidHostname("my-name.co.uk")).toBe(true);
  });

  it("rejects bare labels, invalid chars, and overlong names", () => {
    expect(isValidHostname("myname")).toBe(false); // no dot
    expect(isValidHostname("my name.com")).toBe(false);
    expect(isValidHostname("my_name.com")).toBe(false);
    expect(isValidHostname("a".repeat(300))).toBe(false);
  });
});

describe("isReservedDomain", () => {
  it("rejects our own domains, their subdomains, and localhost", () => {
    expect(isReservedDomain("namesranker.com")).toBe(true);
    expect(isReservedDomain("app.namesranker.com")).toBe(true);
    expect(isReservedDomain("ra-nk.me")).toBe(true);
    expect(isReservedDomain("ra-nk.co")).toBe(true);
    expect(isReservedDomain("localhost")).toBe(true);
  });

  it("allows unrelated domains", () => {
    expect(isReservedDomain("myname.com")).toBe(false);
    expect(isReservedDomain("someoneelse.co")).toBe(false);
  });
});

describe("verificationTxtName", () => {
  it("prepends the _namesranker record prefix", () => {
    expect(verificationTxtName("myname.com")).toBe("_namesranker.myname.com");
  });
});

describe("setCustomDomain", () => {
  it("generates a token and stores the domain unverified", async () => {
    const result = await setCustomDomain("u1", "p1", "https://myname.com/");

    expect(result.domain).toBe("myname.com");
    expect(result.token).toMatch(/^[0-9a-f]{32}$/);
    expect(result.txtName).toBe("_namesranker.myname.com");
    expect(mocks.prisma.page.update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: {
        customDomain: "myname.com",
        customDomainToken: result.token,
        customDomainVerifiedAt: null,
      },
    });
    expect(mocks.revalidatePublicPages).toHaveBeenCalledWith("alex-morgan");
  });

  it("rejects reserved and invalid domains", async () => {
    await expect(setCustomDomain("u1", "p1", "namesranker.com")).rejects.toThrow("reserved_domain");
    await expect(setCustomDomain("u1", "p1", "notadomain")).rejects.toThrow("invalid_domain");
  });

  it("rejects a domain already attached to another page", async () => {
    mocks.prisma.page.findUnique.mockResolvedValue({ id: "p2" });
    await expect(setCustomDomain("u1", "p1", "myname.com")).rejects.toThrow("domain_taken");
  });

  it("rejects free users", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({ id: "u1", plan: "FREE" });
    await expect(setCustomDomain("u1", "p1", "myname.com")).rejects.toBeInstanceOf(ClaimError);
  });
});

describe("verifyCustomDomain", () => {
  it("marks verified when the TXT record contains our token", async () => {
    mocks.prisma.page.findUnique.mockResolvedValue({
      customDomain: "myname.com",
      customDomainToken: "tok123",
    });
    mocks.resolveTxt.mockResolvedValue([["tok123"], ["other"]]);

    const result = await verifyCustomDomain("u1", "p1");
    expect(result.verified).toBe(true);
    expect(mocks.resolveTxt).toHaveBeenCalledWith("_namesranker.myname.com");
    expect(mocks.prisma.page.update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { customDomainVerifiedAt: expect.any(Date) },
    });
  });

  it("throws verification_failed when the TXT record is missing or mismatched", async () => {
    mocks.prisma.page.findUnique.mockResolvedValue({
      customDomain: "myname.com",
      customDomainToken: "tok123",
    });
    mocks.resolveTxt.mockResolvedValue([["nope"]]);

    await expect(verifyCustomDomain("u1", "p1")).rejects.toThrow("verification_failed");

    mocks.resolveTxt.mockRejectedValue(new Error("ENOTFOUND"));
    await expect(verifyCustomDomain("u1", "p1")).rejects.toThrow("verification_failed");
  });
});

describe("removeCustomDomain", () => {
  it("clears the domain fields", async () => {
    await removeCustomDomain("u1", "p1");
    expect(mocks.prisma.page.update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: {
        customDomain: null,
        customDomainToken: null,
        customDomainVerifiedAt: null,
      },
    });
  });

  it("throws not_found for another user's page", async () => {
    mocks.prisma.page.findFirst.mockResolvedValue(null);
    await expect(removeCustomDomain("u1", "p1")).rejects.toThrow("not_found");
  });
});

describe("resolvePageByHost", () => {
  it("returns the verified live page for a matching host", async () => {
    mocks.prisma.page.findFirst.mockResolvedValue({ path: "alex-morgan", title: "Alex Morgan" });
    const result = await resolvePageByHost("myname.com");
    expect(result).toEqual({ path: "alex-morgan", title: "Alex Morgan", host: "myname.com" });
    expect(mocks.prisma.page.findFirst).toHaveBeenCalledWith({
      where: {
        customDomain: "myname.com",
        customDomainVerifiedAt: { not: null },
        status: "LIVE",
      },
      select: { path: true, title: true },
    });
  });

  it("returns null for unknown hosts", async () => {
    mocks.prisma.page.findFirst.mockResolvedValue(null);
    await expect(resolvePageByHost("unknown.com")).resolves.toBeNull();
    await expect(resolvePageByHost("")).resolves.toBeNull();
  });
});
