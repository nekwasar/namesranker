import { describe, expect, it, vi, beforeEach } from "vitest";
import { syncAutoConnectors, syncConnector, syncPageConnectors } from "@/lib/imports/imports";

const mocks = vi.hoisted(() => {
  const prisma = {
    importConnector: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    importedContent: { findMany: vi.fn(), createMany: vi.fn() },
    contentBlock: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      createMany: vi.fn(),
      aggregate: vi.fn(),
    },
  };
  const revalidatePublicPages = vi.fn();
  const fetchByType = vi.fn();
  return { prisma, revalidatePublicPages, fetchByType };
});

vi.mock("@/lib/db", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/revalidate", () => ({ revalidatePublicPages: mocks.revalidatePublicPages }));
vi.mock("@/lib/imports/fetchers", () => ({
  fetchByType: mocks.fetchByType,
  ImportError: class ImportError extends Error {
    constructor(code: string, message?: string) {
      super(message ?? code);
      this.code = code;
    }
    code: string;
  },
}));

function connector(overrides: Record<string, unknown> = {}) {
  return {
    id: "c1",
    pageId: "p1",
    type: "RSS",
    externalUrl: "https://alex.example.com/feed.xml",
    autoSync: false,
    lastSyncedAt: null,
    page: { path: "alex-morgan" },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.revalidatePublicPages.mockResolvedValue(undefined);
  mocks.prisma.importConnector.update.mockResolvedValue({ id: "c1" });
  mocks.prisma.importedContent.createMany.mockResolvedValue({ count: 1 });
  mocks.prisma.importedContent.findMany.mockResolvedValue([]);
  mocks.prisma.contentBlock.aggregate.mockResolvedValue({ _max: { order: 3 } });
  mocks.prisma.contentBlock.findMany.mockResolvedValue([]);
});

describe("syncConnector", () => {
  it("imports fresh items, skips duplicates, and rewrites blocks", async () => {
    mocks.prisma.importConnector.findUnique.mockResolvedValue(connector());
    mocks.fetchByType.mockResolvedValue([
      { title: "Post A", url: "https://alex.example.com/a" },
      { title: "Post B", url: "https://alex.example.com/b" },
    ]);
    // Call 1: dedupe lookup (existing URLs). Call 2: rows to render as blocks.
    mocks.prisma.importedContent.findMany
      .mockResolvedValueOnce([{ url: "https://alex.example.com/a" }])
      .mockResolvedValueOnce([
        { title: "Post B", url: "https://alex.example.com/b", content: null, publishedAt: null },
      ]);

    const result = await syncConnector("c1");

    expect(result).toMatchObject({ ok: true, fetched: 2, imported: 1, skippedDuplicates: 1 });
    expect(mocks.prisma.importedContent.createMany).toHaveBeenCalledWith({
      data: [
        {
          connectorId: "c1",
          title: "Post B",
          url: "https://alex.example.com/b",
          content: null,
          publishedAt: null,
        },
      ],
    });
    // The imported row becomes a PUBLICATION block with an importedFrom marker.
    expect(mocks.prisma.contentBlock.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({
            pageId: "p1",
            type: "PUBLICATION",
            payload: expect.objectContaining({
              title: "Post B",
              url: "https://alex.example.com/b",
              importedFrom: "c1",
            }),
          }),
        ]),
      })
    );
    expect(mocks.prisma.importConnector.update).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: { lastSyncedAt: expect.any(Date) },
    });
    expect(mocks.revalidatePublicPages).toHaveBeenCalledWith("alex-morgan");
  });

  it("maps GitHub items to PROJECT blocks", async () => {
    mocks.prisma.importConnector.findUnique.mockResolvedValue(
      connector({ type: "GITHUB", externalUrl: "https://github.com/alex" })
    );
    mocks.fetchByType.mockResolvedValue([
      { title: "repo", url: "https://github.com/alex/repo", content: "desc" },
    ]);
    mocks.prisma.importedContent.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { title: "repo", url: "https://github.com/alex/repo", content: "desc", publishedAt: null },
      ]);

    await syncConnector("c1");

    expect(mocks.prisma.contentBlock.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({
            type: "PROJECT",
            payload: expect.objectContaining({
              title: "repo",
              url: "https://github.com/alex/repo",
              description: "desc",
            }),
          }),
        ]),
      })
    );
  });

  it("removes stale imported blocks before writing new ones", async () => {
    mocks.prisma.importConnector.findUnique.mockResolvedValue(connector());
    mocks.fetchByType.mockResolvedValue([{ title: "Post", url: "https://alex.example.com/new" }]);
    mocks.prisma.importedContent.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { title: "Post", url: "https://alex.example.com/new", content: null, publishedAt: null },
      ]);
    mocks.prisma.contentBlock.findMany.mockResolvedValue([
      { id: "b1", payload: { importedFrom: "c1" } },
      { id: "b2", payload: { title: "user-written" } }, // not imported — keep
    ]);

    await syncConnector("c1");

    expect(mocks.prisma.contentBlock.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["b1"] } },
    });
  });

  it("surfaces fetch failures without throwing", async () => {
    mocks.prisma.importConnector.findUnique.mockResolvedValue(connector());
    mocks.fetchByType.mockRejectedValue(new Error("upstream down"));

    const result = await syncConnector("c1");

    expect(result.ok).toBe(false);
    expect(result.error).toBe("Sync failed");
    // lastSyncedAt not bumped on failure.
    expect(mocks.prisma.importConnector.update).not.toHaveBeenCalled();
  });

  it("throws for unknown connectors", async () => {
    mocks.prisma.importConnector.findUnique.mockResolvedValue(null);
    await expect(syncConnector("nope")).rejects.toThrow("Connector not found");
  });
});

describe("syncAutoConnectors", () => {
  it("syncs only autoSync connectors and counts failures", async () => {
    mocks.prisma.importConnector.findMany.mockResolvedValue([{ id: "c1" }, { id: "c2" }]);
    mocks.prisma.importConnector.findUnique.mockImplementation(async ({ where }) =>
      where.id === "c1" ? connector() : connector({ id: "c2", pageId: "p2" })
    );
    mocks.fetchByType
      .mockResolvedValueOnce([{ title: "A", url: "https://x/a" }])
      .mockRejectedValueOnce(new Error("boom"));

    const result = await syncAutoConnectors();
    expect(result).toEqual({ synced: 1, failed: 1 });
  });
});

describe("syncPageConnectors", () => {
  it("syncs every connector on a page", async () => {
    mocks.prisma.importConnector.findMany.mockResolvedValue([{ id: "c1" }, { id: "c2" }]);
    mocks.prisma.importConnector.findUnique.mockImplementation(async ({ where }) =>
      connector(where.id === "c2" ? { id: "c2", pageId: "p1" } : {})
    );
    mocks.fetchByType.mockResolvedValue([{ title: "A", url: "https://x/a" }]);

    const results = await syncPageConnectors("p1");
    expect(results).toHaveLength(2);
    expect(results.every((r) => r.ok)).toBe(true);
  });
});
