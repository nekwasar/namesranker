import { describe, expect, it, vi, beforeEach } from "vitest";
import { ClaimError, claimName } from "@/lib/claims/claim";

const mocks = vi.hoisted(() => {
  const prisma = {
    user: { findUnique: vi.fn() },
    nameClaim: { findFirst: vi.fn(), create: vi.fn() },
    keyword: { findFirst: vi.fn() },
  };
  const sendEmail = vi.fn();
  return { prisma, sendEmail };
});

vi.mock("@/lib/db", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/email", () => ({
  sendEmail: mocks.sendEmail,
  claimConfirmationEmail: (_to: string, slug: string, url: string) => ({
    to: _to,
    subject: `You claimed ${slug} on NamesRanker`,
    tags: ["claim-confirmation"],
    url,
  }),
}));

const p2002Slug = () =>
  Object.assign(new Error("Unique constraint failed on slug"), {
    code: "P2002",
    meta: { target: ["slug"] },
  });

// Prisma 7 + pg driver adapter shape (meta.driverAdapterError.cause.constraint.fields)
const p2002SlugAdapter = () =>
  Object.assign(new Error("Unique constraint failed on slug"), {
    code: "P2002",
    meta: {
      modelName: "NameClaim",
      driverAdapterError: {
        cause: {
          originalCode: "23505",
          originalMessage: 'duplicate key value violates unique constraint "NameClaim_slug_key"',
          kind: "UniqueConstraintViolation",
          constraint: { fields: ["slug"] },
        },
      },
    },
  });

function freeUser() {
  return { id: "u1", email: "a@example.com", plan: "FREE" };
}

function premiumUser() {
  return { id: "u1", email: "a@example.com", plan: "PREMIUM" };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.prisma.user.findUnique.mockResolvedValue(freeUser());
  mocks.prisma.nameClaim.findFirst.mockResolvedValue(null);
  mocks.sendEmail.mockResolvedValue(undefined);
});

describe("claimName — two-word claims (free)", () => {
  it("claims the base slug as STANDARD/CLAIMED", async () => {
    mocks.prisma.nameClaim.create.mockResolvedValue({
      id: "c1",
      slug: "john-smith",
      wordCount: 2,
      type: "STANDARD",
      status: "CLAIMED",
    });

    const { claim, pageUrl } = await claimName({
      userId: "u1",
      email: "a@example.com",
      name: "John Smith",
    });

    expect(claim.slug).toBe("john-smith");
    expect(claim.type).toBe("STANDARD");
    expect(pageUrl).toContain("john-smith");
    expect(mocks.prisma.nameClaim.create).toHaveBeenCalledWith({
      data: {
        slug: "john-smith",
        wordCount: 2,
        type: "STANDARD",
        status: "CLAIMED",
        claimedById: "u1",
        keyword: null,
      },
    });
  });

  it("claims a curated keyword variant as KEYWORD with the keyword stored", async () => {
    mocks.prisma.keyword.findFirst.mockResolvedValue({ id: "k1" });
    mocks.prisma.nameClaim.create.mockResolvedValue({
      id: "c1",
      slug: "john-smith-codes",
      wordCount: 2,
      type: "KEYWORD",
      status: "CLAIMED",
      keyword: "codes",
    });

    const { claim } = await claimName({
      userId: "u1",
      email: "a@example.com",
      name: "John Smith",
      keyword: "codes",
    });

    expect(claim.slug).toBe("john-smith-codes");
    expect(mocks.prisma.nameClaim.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: "KEYWORD", keyword: "codes" }),
      })
    );
  });

  it("rejects a keyword that is not in the curated list", async () => {
    mocks.prisma.keyword.findFirst.mockResolvedValue(null);

    await expect(
      claimName({ userId: "u1", email: "a@example.com", name: "John Smith", keyword: "haxxor" })
    ).rejects.toMatchObject({ code: "invalid_keyword" });
  });

  it("throws keyword_required when the bare base slug is taken (race)", async () => {
    mocks.prisma.nameClaim.create.mockRejectedValue(p2002Slug());

    await expect(
      claimName({ userId: "u1", email: "a@example.com", name: "John Smith" })
    ).rejects.toMatchObject({ code: "keyword_required" });
  });
});

describe("claimName — race safety (P2002 retry)", () => {
  it("retries the next variant when a concurrent claim wins the slug", async () => {
    mocks.prisma.keyword.findFirst.mockResolvedValue({ id: "k1" });
    mocks.prisma.nameClaim.create
      .mockRejectedValueOnce(p2002Slug()) // john-smith taken by someone else
      .mockResolvedValueOnce({
        id: "c1",
        slug: "john-smith-codes",
        wordCount: 2,
        type: "KEYWORD",
        status: "CLAIMED",
        keyword: "codes",
      });

    const { claim } = await claimName({
      userId: "u1",
      email: "a@example.com",
      name: "John Smith",
      keyword: "codes",
    });

    expect(claim.slug).toBe("john-smith-codes");
    expect(mocks.prisma.nameClaim.create).toHaveBeenCalledTimes(2);
  });

  it("recognizes slug conflicts reported in driver-adapter error shape (Prisma 7 + pg)", async () => {
    mocks.prisma.keyword.findFirst.mockResolvedValue({ id: "k1" });
    mocks.prisma.nameClaim.create
      .mockRejectedValueOnce(p2002SlugAdapter()) // alex-morgan taken by someone else
      .mockResolvedValueOnce({
        id: "c1",
        slug: "john-smith-codes",
        wordCount: 2,
        type: "KEYWORD",
        status: "CLAIMED",
        keyword: "codes",
      });

    const { claim } = await claimName({
      userId: "u1",
      email: "a@example.com",
      name: "John Smith",
      keyword: "codes",
    });

    expect(claim.slug).toBe("john-smith-codes");
    expect(mocks.prisma.nameClaim.create).toHaveBeenCalledTimes(2);
  });

  it("throws no_slug_available when every candidate is taken", async () => {
    mocks.prisma.keyword.findFirst.mockResolvedValue({ id: "k1" });
    mocks.prisma.nameClaim.create.mockRejectedValue(p2002Slug());

    await expect(
      claimName({ userId: "u1", email: "a@example.com", name: "John Smith", keyword: "codes" })
    ).rejects.toMatchObject({ code: "no_slug_available" });
    // base + 10 numbered variants attempted
    expect(mocks.prisma.nameClaim.create).toHaveBeenCalledTimes(11);
  });

  it("maps a user-level unique violation (partial index) to already_claimed", async () => {
    const otherConflict = Object.assign(new Error("unique"), {
      code: "P2002",
      meta: { target: ["claimedById"] },
    });
    mocks.prisma.keyword.findFirst.mockResolvedValue({ id: "k1" });
    mocks.prisma.nameClaim.create.mockRejectedValue(otherConflict);

    await expect(
      claimName({ userId: "u1", email: "a@example.com", name: "John Smith", keyword: "codes" })
    ).rejects.toMatchObject({ code: "already_claimed" });
    // A user-level conflict must NOT walk the variant chain.
    expect(mocks.prisma.nameClaim.create).toHaveBeenCalledTimes(1);
  });
});

describe("claimName — one-word names are always premium", () => {
  it("rejects one-word claims for free users", async () => {
    await expect(
      claimName({ userId: "u1", email: "a@example.com", name: "Beyoncé" })
    ).rejects.toMatchObject({ code: "one_word_premium" });
    expect(mocks.prisma.nameClaim.create).not.toHaveBeenCalled();
  });

  it("claims one-word names for premium users as ONE_WORD/PROTECTED", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue(premiumUser());
    mocks.prisma.nameClaim.create.mockResolvedValue({
      id: "c1",
      slug: "beyonce",
      wordCount: 1,
      type: "ONE_WORD",
      status: "PROTECTED",
    });

    const { claim } = await claimName({
      userId: "u1",
      email: "a@example.com",
      name: "Beyoncé",
    });

    expect(claim.slug).toBe("beyonce");
    expect(mocks.prisma.nameClaim.create).toHaveBeenCalledWith({
      data: {
        slug: "beyonce",
        wordCount: 1,
        type: "ONE_WORD",
        status: "PROTECTED", // exclusive while subscribed (spec §2.3)
        claimedById: "u1",
        keyword: null,
      },
    });
  });

  it("throws no_slug_available if a premium one-word slug is already taken", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue(premiumUser());
    mocks.prisma.nameClaim.create.mockRejectedValue(p2002Slug());

    await expect(
      claimName({ userId: "u1", email: "a@example.com", name: "Adele" })
    ).rejects.toMatchObject({ code: "no_slug_available" });
  });
});

describe("claimName — premium custom handles", () => {
  it("rejects custom handles for free users", async () => {
    await expect(
      claimName({
        userId: "u1",
        email: "a@example.com",
        name: "John Smith",
        customSlug: "john-dev",
      })
    ).rejects.toMatchObject({ code: "custom_slug_premium_required" });
  });

  it("claims a valid custom handle as CUSTOM for premium users", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue(premiumUser());
    mocks.prisma.nameClaim.create.mockResolvedValue({
      id: "c1",
      slug: "john-smith-dev",
      wordCount: 2,
      type: "CUSTOM",
      status: "CLAIMED",
    });

    const { claim } = await claimName({
      userId: "u1",
      email: "a@example.com",
      name: "John Smith",
      customSlug: "john-smith-dev",
    });

    expect(claim.slug).toBe("john-smith-dev");
    expect(claim.type).toBe("CUSTOM");
  });

  it("rejects invalid custom handles even for premium users", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue(premiumUser());

    await expect(
      claimName({ userId: "u1", email: "a@example.com", name: "John Smith", customSlug: "Admin" })
    ).rejects.toMatchObject({ code: "invalid_custom_slug" });
  });
});

describe("claimName — one hub page per person", () => {
  it("rejects a second active claim for the same user", async () => {
    mocks.prisma.nameClaim.findFirst.mockResolvedValue({ slug: "john-smith" });

    await expect(
      claimName({ userId: "u1", email: "a@example.com", name: "Jane Doe" })
    ).rejects.toMatchObject({ code: "already_claimed" });
    expect(mocks.prisma.nameClaim.create).not.toHaveBeenCalled();
  });

  it("rejects invalid names", async () => {
    await expect(
      claimName({ userId: "u1", email: "a@example.com", name: "   " })
    ).rejects.toMatchObject({ code: "invalid_name" });
  });
});

describe("claimName — confirmation email", () => {
  it("sends a claim-confirmation email on success", async () => {
    mocks.prisma.nameClaim.create.mockResolvedValue({
      id: "c1",
      slug: "john-smith",
      wordCount: 2,
      type: "STANDARD",
      status: "CLAIMED",
    });

    await claimName({ userId: "u1", email: "a@example.com", name: "John Smith" });

    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
    const email = mocks.sendEmail.mock.calls[0][0];
    expect(email.to).toBe("a@example.com");
    expect(email.subject).toContain("john-smith");
    expect(email.tags).toContain("claim-confirmation");
  });

  it("does not fail the claim when the email send fails", async () => {
    mocks.prisma.nameClaim.create.mockResolvedValue({
      id: "c1",
      slug: "john-smith",
      wordCount: 2,
      type: "STANDARD",
      status: "CLAIMED",
    });
    mocks.sendEmail.mockRejectedValue(new Error("brevo down"));

    const { claim } = await claimName({
      userId: "u1",
      email: "a@example.com",
      name: "John Smith",
    });
    expect(claim.slug).toBe("john-smith");
  });
});
