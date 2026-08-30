import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  addConnector,
  createSubPage,
  deleteAccount,
  deleteSubPage,
  exportUserData,
  getSettingsData,
  removeConnector,
  saveContent,
  saveSeo,
  updateSubPage,
} from "@/lib/settings";
import { ClaimError } from "@/lib/claims/claim";

const mocks = vi.hoisted(() => {
  const prisma = {
    user: { findUnique: vi.fn(), delete: vi.fn() },
    nameClaim: { findFirst: vi.fn() },
    page: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    contentBlock: { deleteMany: vi.fn(), createMany: vi.fn() },
    importConnector: { count: vi.fn(), create: vi.fn(), findFirst: vi.fn(), delete: vi.fn() },
    searchConsoleLink: { deleteMany: vi.fn() },
    magicLinkToken: { deleteMany: vi.fn() },
  };
  const revalidatePublicPages = vi.fn();
  return { prisma, revalidatePublicPages };
});

vi.mock("@/lib/db", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/revalidate", () => ({ revalidatePublicPages: mocks.revalidatePublicPages }));

function hubPage(overrides: Record<string, unknown> = {}) {
  return {
    id: "p1",
    ownerId: "u1",
    isHub: true,
    path: "alex-morgan",
    title: "Alex Morgan",
    descriptor: null,
    metaTitle: null,
    metaDescription: null,
    seoScore: 0,
    status: "LIVE",
    blocks: [],
    connectors: [],
    ...overrides,
  };
}

function activeClaim(slug = "alex-morgan", type = "STANDARD") {
  return { slug, type };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.revalidatePublicPages.mockResolvedValue(undefined);
  mocks.prisma.page.findFirst.mockResolvedValue(hubPage());
  mocks.prisma.page.update.mockResolvedValue(hubPage());
  mocks.prisma.user.findUnique.mockResolvedValue({
    id: "u1",
    email: "a@example.com",
    plan: "PREMIUM",
  });
  mocks.prisma.nameClaim.findFirst.mockResolvedValue(activeClaim());
});

describe("getSettingsData", () => {
  it("aggregates claim + pages with computed seoScore", async () => {
    mocks.prisma.page.findMany.mockResolvedValue([
      hubPage({
        descriptor: "Product Designer",
        metaTitle: "Alex Morgan — Product Designer in Austin, TX",
        blocks: [{ type: "BIO", payload: { text: "Designer." }, order: 0 }],
        connectors: [
          { id: "c1", type: "GITHUB", externalUrl: "https://github.com/alex", lastSyncedAt: null },
        ],
      }),
    ]);

    const data = await getSettingsData("u1");

    expect(data.claim).toEqual({ slug: "alex-morgan", type: "STANDARD" });
    expect(data.name).toBe("Alex Morgan");
    expect(data.pages).toHaveLength(1);
    expect(data.pages[0]).toMatchObject({
      path: "alex-morgan",
      isHub: true,
      content: { bio: "Designer." },
      connectors: [{ id: "c1", type: "GITHUB", externalUrl: "https://github.com/alex" }],
    });
    expect(data.pages[0].seoScore).toBeGreaterThan(0);
  });

  it("returns no claim when the user has none", async () => {
    mocks.prisma.page.findMany.mockResolvedValue([]);
    mocks.prisma.nameClaim.findFirst.mockResolvedValue(null);

    const data = await getSettingsData("u1");
    expect(data.claim).toBeNull();
    expect(data.name).toBe("");
    expect(data.pages).toEqual([]);
  });
});

describe("saveContent", () => {
  it("saves profile descriptor, photo, and bio", async () => {
    await saveContent("u1", "p1", "profile", {
      descriptor: "Product Designer",
      photoUrl: "https://example.com/me.jpg",
      bio: "Designer for 8 years.",
    });

    expect(mocks.prisma.page.update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { descriptor: "Product Designer" },
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
    expect(mocks.revalidatePublicPages).toHaveBeenCalledWith("alex-morgan");
  });

  it("filters empty social links", async () => {
    await saveContent("u1", "p1", "socials", {
      links: [
        { platform: "LinkedIn", url: "https://linkedin.com/in/alex" },
        { platform: "", url: "" },
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

  it("throws not_found for another user's page", async () => {
    mocks.prisma.page.findFirst.mockResolvedValue(null);

    await expect(saveContent("u1", "p1", "profile", {})).rejects.toThrow("not_found");
  });

  it("drops empty experience rows", async () => {
    await saveContent("u1", "p1", "experience", {
      experience: [
        { role: "Senior Designer", company: "Lumen" },
        { role: "", company: "" },
      ],
    });

    expect(mocks.prisma.contentBlock.createMany).toHaveBeenCalledWith({
      data: [
        {
          pageId: "p1",
          type: "EXPERIENCE",
          payload: { role: "Senior Designer", company: "Lumen" },
          order: 0,
        },
      ],
    });
  });
});

describe("saveSeo", () => {
  it("updates meta fields and trims empties to null", async () => {
    await saveSeo("u1", "p1", {
      metaTitle: "  Alex Morgan — Product Designer  ",
      metaDescription: "",
    });

    expect(mocks.prisma.page.update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { metaTitle: "Alex Morgan — Product Designer", metaDescription: null },
    });
    expect(mocks.revalidatePublicPages).toHaveBeenCalledWith("alex-morgan");
  });
});

describe("sub-pages", () => {
  it("creates a sub-page under the claimed slug namespace", async () => {
    mocks.prisma.page.create.mockResolvedValue(
      hubPage({ id: "p2", isHub: false, path: "alex-morgan/portfolio", title: "Portfolio" })
    );
    mocks.prisma.page.findFirst.mockResolvedValue(
      hubPage({ id: "p2", isHub: false, path: "alex-morgan/portfolio" })
    );

    const page = await createSubPage("u1", {
      title: "Portfolio",
      segment: "portfolio",
      descriptor: "Selected work",
    });

    expect(mocks.prisma.page.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ownerId: "u1",
          isHub: false,
          path: "alex-morgan/portfolio",
          status: "LIVE",
        }),
      })
    );
    expect(page.path).toBe("alex-morgan/portfolio");
    expect(mocks.revalidatePublicPages).toHaveBeenCalledWith("alex-morgan");
  });

  it("rejects free users", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({
      id: "u1",
      email: "a@example.com",
      plan: "FREE",
    });

    await expect(
      createSubPage("u1", { title: "Portfolio", segment: "portfolio" })
    ).rejects.toBeInstanceOf(ClaimError);
    await expect(createSubPage("u1", { title: "Portfolio", segment: "portfolio" })).rejects.toThrow(
      "premium_required"
    );
  });

  it("rejects invalid segments and taken paths", async () => {
    await expect(createSubPage("u1", { title: "x", segment: "bad slug!" })).rejects.toThrow(
      "invalid_slug"
    );

    mocks.prisma.page.findUnique.mockResolvedValue({ id: "p9" });
    await expect(createSubPage("u1", { title: "x", segment: "taken" })).rejects.toThrow(
      "path_taken"
    );
  });

  it("updates a sub-page without touching the hub", async () => {
    mocks.prisma.page.findFirst.mockResolvedValue(
      hubPage({ id: "p2", isHub: false, path: "alex-morgan/portfolio", title: "Portfolio" })
    );

    await updateSubPage("u1", "p2", { title: "Portfolio 2026" });

    expect(mocks.prisma.page.update).toHaveBeenCalledWith({
      where: { id: "p2" },
      data: expect.objectContaining({ title: "Portfolio 2026" }),
    });
  });

  it("refuses to delete the hub page", async () => {
    await expect(deleteSubPage("u1", "p1")).rejects.toThrow("invalid_slug");
  });

  it("deletes a sub-page and revalidates the hub path", async () => {
    mocks.prisma.page.findFirst.mockResolvedValue(
      hubPage({ id: "p2", isHub: false, path: "alex-morgan/portfolio", title: "Portfolio" })
    );

    await deleteSubPage("u1", "p2");

    expect(mocks.prisma.page.delete).toHaveBeenCalledWith({ where: { id: "p2" } });
    expect(mocks.revalidatePublicPages).toHaveBeenCalledWith("alex-morgan");
  });
});

describe("connectors", () => {
  it("adds a connector up to the limit of 3", async () => {
    mocks.prisma.importConnector.count.mockResolvedValue(0);
    mocks.prisma.importConnector.create.mockResolvedValue({
      id: "c1",
      type: "GITHUB",
      externalUrl: "https://github.com/alex",
    });

    const connector = await addConnector("u1", "p1", {
      type: "GITHUB",
      externalUrl: "https://github.com/alex",
    });

    expect(connector).toEqual({ id: "c1", type: "GITHUB", externalUrl: "https://github.com/alex" });
  });

  it("rejects a fourth connector", async () => {
    mocks.prisma.importConnector.count.mockResolvedValue(3);

    await expect(
      addConnector("u1", "p1", { type: "GITHUB", externalUrl: "https://github.com/alex" })
    ).rejects.toThrow("connector_limit");
  });

  it("removes only connectors owned by the user", async () => {
    mocks.prisma.importConnector.findFirst.mockResolvedValue({ id: "c1" });
    await removeConnector("u1", "c1");
    expect(mocks.prisma.importConnector.delete).toHaveBeenCalledWith({ where: { id: "c1" } });

    mocks.prisma.importConnector.findFirst.mockResolvedValue(null);
    await expect(removeConnector("u1", "c2")).rejects.toThrow("not_found");
  });
});

describe("GDPR", () => {
  it("exports the full user record", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({
      id: "u1",
      email: "a@example.com",
      claims: [],
      pages: [],
      monitoring: [],
    });

    const data = await exportUserData("u1");

    expect(data).toMatchObject({ user: { id: "u1", email: "a@example.com" } });
    expect((data as { exportedAt: string }).exportedAt).toBeDefined();
  });

  it("deletes the account and cleans orphans", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({ id: "u1", email: "a@example.com" });
    mocks.prisma.page.findMany.mockResolvedValue([{ id: "p1" }]);

    await deleteAccount("u1");

    expect(mocks.prisma.searchConsoleLink.deleteMany).toHaveBeenCalledWith({
      where: { pageId: { in: ["p1"] } },
    });
    expect(mocks.prisma.magicLinkToken.deleteMany).toHaveBeenCalledWith({
      where: { email: "a@example.com" },
    });
    expect(mocks.prisma.user.delete).toHaveBeenCalledWith({ where: { id: "u1" } });
  });

  it("throws not_found for unknown users", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue(null);
    await expect(deleteAccount("u1")).rejects.toThrow("not_found");
    await expect(exportUserData("u1")).rejects.toThrow("not_found");
  });
});
