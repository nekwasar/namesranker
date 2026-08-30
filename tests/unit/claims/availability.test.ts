import { describe, expect, it, vi, beforeEach } from "vitest";
import { getAvailability, getKeywords, getRecentClaims, timeAgo } from "@/lib/claims/availability";

const mocks = vi.hoisted(() => {
  const prisma = {
    nameClaim: { findMany: vi.fn() },
    keyword: { findMany: vi.fn() },
  };
  return { prisma };
});

vi.mock("@/lib/db", () => ({ prisma: mocks.prisma }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getAvailability", () => {
  it("reports the base slug as available when nothing is claimed", async () => {
    mocks.prisma.nameClaim.findMany.mockResolvedValue([]);
    mocks.prisma.keyword.findMany.mockResolvedValue([{ keyword: "codes" }]);

    const result = await getAvailability("John Smith", "engineering");

    expect(result.slug).toBe("john-smith");
    expect(result.wordCount).toBe(2);
    expect(result.isOneWord).toBe(false);
    expect(result.baseAvailable).toBe(true);
    expect(result.claimable).toBe(true);
    expect(result.variants).toEqual([
      {
        keyword: "codes",
        slug: "john-smith-codes",
        available: true,
        fallbackSlug: "john-smith-codes-2",
        fallbackAvailable: true,
      },
    ]);
  });

  it("marks taken slugs unavailable using only active claim statuses", async () => {
    mocks.prisma.keyword.findMany.mockResolvedValue([{ keyword: "codes" }, { keyword: "designs" }]);
    // john-smith and john-smith-codes are actively claimed; john-smith-codes-2 is free.
    mocks.prisma.nameClaim.findMany.mockResolvedValue([
      { slug: "john-smith" },
      { slug: "john-smith-codes", status: "CLAIMED" },
    ]);

    const result = await getAvailability("John Smith", "engineering");

    expect(result.baseAvailable).toBe(false);
    expect(result.variants[0]).toMatchObject({
      keyword: "codes",
      available: false,
      fallbackSlug: "john-smith-codes-2",
      fallbackAvailable: true,
    });
    expect(result.variants[1]).toMatchObject({ keyword: "designs", available: true });
    expect(result.claimable).toBe(true);
  });

  it("detects one-word names", async () => {
    mocks.prisma.nameClaim.findMany.mockResolvedValue([]);

    const result = await getAvailability("Beyoncé");
    expect(result.isOneWord).toBe(true);
    expect(result.slug).toBe("beyonce");
  });

  it("returns no variants without a profession", async () => {
    mocks.prisma.nameClaim.findMany.mockResolvedValue([]);
    mocks.prisma.keyword.findMany.mockResolvedValue([]);

    const result = await getAvailability("John Smith");
    expect(result.variants).toEqual([]);
  });

  it("reports claimable=false when base and every variant are taken", async () => {
    mocks.prisma.keyword.findMany.mockResolvedValue([{ keyword: "codes" }]);
    mocks.prisma.nameClaim.findMany.mockResolvedValue([
      { slug: "john-smith" },
      { slug: "john-smith-codes" },
      { slug: "john-smith-codes-2" },
    ]);

    const result = await getAvailability("John Smith", "engineering");
    expect(result.claimable).toBe(false);
  });
});

describe("getRecentClaims", () => {
  it("returns newest claims with a relative time label", async () => {
    const now = Date.now();
    const tenMinutesAgo = new Date(now - 10 * 60 * 1000);
    mocks.prisma.nameClaim.findMany.mockResolvedValue([
      { slug: "jane-doe", claimedAt: tenMinutesAgo },
      { slug: "john-smith", claimedAt: new Date(now - 2 * 60 * 60 * 1000) },
    ]);

    const claims = await getRecentClaims(2);

    expect(mocks.prisma.nameClaim.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { in: ["CLAIMED", "PROTECTED", "PENDING_RELEASE"] },
        }),
        orderBy: { claimedAt: "desc" },
        take: 2,
      })
    );
    expect(claims[0]).toMatchObject({ slug: "jane-doe", ago: "10m ago" });
    expect(claims[1]).toMatchObject({ slug: "john-smith", ago: "2h ago" });
  });
});

describe("getKeywords", () => {
  it("groups curated keywords by profession", async () => {
    mocks.prisma.keyword.findMany.mockResolvedValue([
      { profession: "design", keyword: "designs" },
      { profession: "design", keyword: "sketches" },
      { profession: "engineering", keyword: "codes" },
    ]);

    const groups = await getKeywords();

    expect(groups).toEqual([
      { profession: "design", keywords: ["designs", "sketches"] },
      { profession: "engineering", keywords: ["codes"] },
    ]);
  });

  it("filters by profession when provided", async () => {
    mocks.prisma.keyword.findMany.mockResolvedValue([
      { profession: "engineering", keyword: "codes" },
    ]);

    const groups = await getKeywords("engineering");
    expect(groups).toEqual([{ profession: "engineering", keywords: ["codes"] }]);
    expect(mocks.prisma.keyword.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { profession: "engineering" } })
    );
  });
});

describe("timeAgo", () => {
  const now = 1_000_000_000_000;

  it("labels recent and older timestamps", () => {
    expect(timeAgo(new Date(now), now)).toBe("just now");
    expect(timeAgo(new Date(now - 30_000), now)).toBe("just now");
    expect(timeAgo(new Date(now - 5 * 60_000), now)).toBe("5m ago");
    expect(timeAgo(new Date(now - 3 * 3_600_000), now)).toBe("3h ago");
    expect(timeAgo(new Date(now - 2 * 86_400_000), now)).toBe("2d ago");
  });
});
