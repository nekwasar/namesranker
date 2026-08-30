import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  completeOnboarding,
  findNudgeCandidates,
  getOnboardingState,
  getPreviewData,
  saveStep,
  skipStep,
  titleFromSlug,
} from "@/lib/onboarding";
import { sendOnboardingNudges } from "@/lib/nudges";

const mocks = vi.hoisted(() => {
  const prisma = {
    user: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    nameClaim: { findFirst: vi.fn() },
    page: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    contentBlock: { deleteMany: vi.fn(), createMany: vi.fn() },
    importConnector: { deleteMany: vi.fn(), createMany: vi.fn() },
  };
  const revalidatePublicPages = vi.fn();
  const sendEmail = vi.fn();
  return { prisma, revalidatePublicPages, sendEmail };
});

vi.mock("@/lib/db", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/revalidate", () => ({ revalidatePublicPages: mocks.revalidatePublicPages }));
vi.mock("@/lib/email", () => ({
  sendEmail: mocks.sendEmail,
  onboardingNudgeEmail: (_to: string, name: string, slug: string) => ({
    to: slug,
    subject: "nudge",
  }),
}));

function activeClaim(slug = "alex-morgan") {
  return { slug, type: "STANDARD" };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.revalidatePublicPages.mockResolvedValue(undefined);
  mocks.prisma.user.update.mockResolvedValue({ id: "u1" });
  mocks.prisma.page.create.mockResolvedValue({ id: "p1", path: "alex-morgan" });
  mocks.prisma.page.update.mockResolvedValue({ id: "p1" });
});

describe("titleFromSlug", () => {
  it("prettifies slugs into display names", () => {
    expect(titleFromSlug("alex-morgan")).toBe("Alex Morgan");
    expect(titleFromSlug("mary-jane-watson")).toBe("Mary Jane Watson");
    expect(titleFromSlug("beyonce")).toBe("Beyonce");
  });
});

describe("getOnboardingState", () => {
  it("returns step 1 when the user has no claim", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({ onboardingStep: null, onboardedAt: null });
    mocks.prisma.nameClaim.findFirst.mockResolvedValue(null);

    const state = await getOnboardingState("u1");
    expect(state).toMatchObject({ step: 1, completed: false, claim: null });
  });

  it("resumes at step 2 after claiming but before saving anything", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({ onboardingStep: null, onboardedAt: null });
    mocks.prisma.nameClaim.findFirst.mockResolvedValue(activeClaim());

    const state = await getOnboardingState("u1");
    expect(state.step).toBe(2);
    expect(state.claim?.slug).toBe("alex-morgan");
    expect(state.name).toBe("Alex Morgan");
  });

  it("resumes at the first incomplete step", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({ onboardingStep: 5, onboardedAt: null });
    mocks.prisma.nameClaim.findFirst.mockResolvedValue(activeClaim());

    const state = await getOnboardingState("u1");
    expect(state.step).toBe(6);
  });

  it("reports completed once onboarded", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({
      onboardingStep: 7,
      onboardedAt: new Date(),
    });
    mocks.prisma.nameClaim.findFirst.mockResolvedValue(activeClaim());

    const state = await getOnboardingState("u1");
    expect(state.completed).toBe(true);
    expect(state.step).toBe(7);
  });
});

describe("saveStep", () => {
  it("saves descriptor, photo, and bio for step 2 (creating the hub page lazily)", async () => {
    mocks.prisma.nameClaim.findFirst.mockResolvedValue(activeClaim());
    mocks.prisma.page.findFirst.mockResolvedValue(null); // no hub page yet
    mocks.prisma.page.create.mockResolvedValue({ id: "p1", path: "alex-morgan" });
    mocks.prisma.user.findUnique.mockResolvedValue({ onboardingStep: null });

    await saveStep("u1", 2, {
      descriptor: "Product Designer · Austin",
      photoUrl: "https://example.com/me.jpg",
      bio: "Designer for 8 years.",
    });

    expect(mocks.prisma.page.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ path: "alex-morgan", isHub: true, status: "DRAFT" }),
      })
    );
    expect(mocks.prisma.page.update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { descriptor: "Product Designer · Austin" },
    });
    expect(mocks.prisma.contentBlock.deleteMany).toHaveBeenCalledWith({
      where: { pageId: "p1", type: { in: ["PHOTO", "BIO"] } },
    });
    expect(mocks.prisma.contentBlock.createMany).toHaveBeenCalledWith({
      data: [
        { pageId: "p1", type: "PHOTO", payload: { url: "https://example.com/me.jpg" }, order: 0 },
        { pageId: "p1", type: "BIO", payload: { text: "Designer for 8 years." }, order: 1 },
      ],
    });
    // resume pointer advanced to step 2
    expect(mocks.prisma.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { onboardingStep: 2 },
    });
  });

  it("saves social links for step 3", async () => {
    mocks.prisma.nameClaim.findFirst.mockResolvedValue(activeClaim());
    mocks.prisma.page.findFirst.mockResolvedValue({ id: "p1", path: "alex-morgan" });
    mocks.prisma.user.findUnique.mockResolvedValue({ onboardingStep: 2 });

    await saveStep("u1", 3, {
      links: [
        { platform: "LinkedIn", url: "https://linkedin.com/in/alex" },
        { platform: "", url: "" }, // filtered out
      ],
    });

    expect(mocks.prisma.contentBlock.createMany).toHaveBeenCalledWith({
      data: [
        {
          pageId: "p1",
          type: "SOCIAL",
          payload: { links: [{ platform: "LinkedIn", url: "https://linkedin.com/in/alex" }] },
          order: 0,
        },
      ],
    });
  });

  it("does not move the resume pointer backwards", async () => {
    mocks.prisma.nameClaim.findFirst.mockResolvedValue(activeClaim());
    mocks.prisma.page.findFirst.mockResolvedValue({ id: "p1", path: "alex-morgan" });
    mocks.prisma.user.findUnique.mockResolvedValue({ onboardingStep: 6 });

    await saveStep("u1", 3, { links: [] });

    expect(mocks.prisma.user.update).not.toHaveBeenCalled();
  });

  it("saves connectors for step 6", async () => {
    mocks.prisma.nameClaim.findFirst.mockResolvedValue(activeClaim());
    mocks.prisma.page.findFirst.mockResolvedValue({ id: "p1", path: "alex-morgan" });
    mocks.prisma.user.findUnique.mockResolvedValue({ onboardingStep: 5 });

    await saveStep("u1", 6, {
      connectors: [{ type: "GITHUB", externalUrl: "https://github.com/alex" }],
    });

    expect(mocks.prisma.importConnector.deleteMany).toHaveBeenCalledWith({
      where: { pageId: "p1" },
    });
    expect(mocks.prisma.importConnector.createMany).toHaveBeenCalledWith({
      data: [{ pageId: "p1", type: "GITHUB", externalUrl: "https://github.com/alex" }],
    });
  });

  it("throws without a claim", async () => {
    mocks.prisma.nameClaim.findFirst.mockResolvedValue(null);

    await expect(saveStep("u1", 2, {})).rejects.toThrow("no_claim");
  });
});

describe("skipStep", () => {
  it("marks the step done and returns the next step", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({ onboardingStep: 2 });

    const next = await skipStep("u1", 3);
    expect(next).toBe(4);
    expect(mocks.prisma.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { onboardingStep: 3 },
    });
  });

  it("does not complete the wizard when skipping the publish step", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({ onboardingStep: 6 });

    const next = await skipStep("u1", 7);
    expect(next).toBe(7);
    expect(mocks.prisma.user.update).not.toHaveBeenCalled();
  });
});

describe("completeOnboarding", () => {
  it("publishes the hub page LIVE and marks the user onboarded", async () => {
    mocks.prisma.nameClaim.findFirst.mockResolvedValue(activeClaim());
    mocks.prisma.page.findFirst.mockResolvedValue({ id: "p1", path: "alex-morgan" });

    const result = await completeOnboarding("u1");

    expect(mocks.prisma.page.update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: expect.objectContaining({ status: "LIVE", publishedAt: expect.any(Date) }),
    });
    expect(mocks.prisma.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: expect.objectContaining({ onboardedAt: expect.any(Date), onboardingStep: 7 }),
    });
    expect(mocks.revalidatePublicPages).toHaveBeenCalledWith("alex-morgan");
    expect(result.path).toBe("alex-morgan");
    expect(result.url).toContain("alex-morgan");
  });
});

describe("getPreviewData", () => {
  it("aggregates all saved blocks into the preview shape", async () => {
    mocks.prisma.nameClaim.findFirst.mockResolvedValue(activeClaim());
    mocks.prisma.page.findFirst.mockResolvedValue({
      id: "p1",
      path: "alex-morgan",
      descriptor: "Product Designer · Austin",
      blocks: [
        { type: "PHOTO", payload: { url: "https://example.com/me.jpg" }, order: 0 },
        { type: "BIO", payload: { text: "Designer." }, order: 1 },
        { type: "EXPERIENCE", payload: { role: "Senior Designer", company: "Lumen" }, order: 2 },
        {
          type: "SOCIAL",
          payload: { links: [{ platform: "LinkedIn", url: "https://x" }] },
          order: 3,
        },
      ],
      connectors: [{ type: "GITHUB", externalUrl: "https://github.com/alex" }],
    });

    const preview = await getPreviewData("u1");

    expect(preview).toMatchObject({
      name: "Alex Morgan",
      path: "alex-morgan",
      descriptor: "Product Designer · Austin",
      photoUrl: "https://example.com/me.jpg",
      bio: "Designer.",
      experience: [{ role: "Senior Designer", company: "Lumen" }],
      socials: [{ platform: "LinkedIn", url: "https://x" }],
      connectors: [{ type: "GITHUB", externalUrl: "https://github.com/alex" }],
    });
  });

  it("returns an empty preview when no hub page exists yet", async () => {
    mocks.prisma.nameClaim.findFirst.mockResolvedValue(activeClaim());
    mocks.prisma.page.findFirst.mockResolvedValue(null);

    const preview = await getPreviewData("u1");
    expect(preview).toMatchObject({
      name: "Alex Morgan",
      path: "alex-morgan",
      bio: null,
      socials: [],
    });
  });
});

describe("sendOnboardingNudges", () => {
  it("sends one nudge per candidate and reports failures without aborting", async () => {
    mocks.prisma.user.findMany.mockResolvedValue([
      { email: "a@example.com", claims: [{ slug: "jane-doe" }] },
      { email: "b@example.com", claims: [{ slug: "john-smith" }] },
    ]);
    mocks.sendEmail.mockReset();
    mocks.sendEmail.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("upstream"));

    const result = await sendOnboardingNudges();

    expect(result).toEqual({ candidates: 2, sent: 1, failed: 1 });
    expect(mocks.sendEmail).toHaveBeenCalledTimes(2);
  });
});

describe("findNudgeCandidates", () => {
  it("only returns users who claimed a name within the 24–48h window", async () => {
    mocks.prisma.user.findMany.mockResolvedValue([
      { email: "a@example.com", claims: [{ slug: "jane-doe" }] },
      { email: "b@example.com", claims: [] }, // claimed nothing → not a candidate
    ]);

    const candidates = await findNudgeCandidates();

    expect(candidates).toEqual([{ email: "a@example.com", name: "Jane Doe", slug: "jane-doe" }]);
    expect(mocks.prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          onboardedAt: null,
          createdAt: { gte: expect.any(Date), lte: expect.any(Date) },
        }),
      })
    );
  });
});
