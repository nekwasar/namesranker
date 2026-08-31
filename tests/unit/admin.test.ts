import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  writeAudit,
  setPageStatus,
  releaseClaim,
  overrideClaimStatus,
  deleteImportedContent,
  setShowcaseStatus,
  AdminError,
} from "@/lib/admin";
import { requireAdminUser, isAdminUser } from "@/lib/admin/auth";

const mocks = vi.hoisted(() => {
  const prisma = {
    auditLog: { create: vi.fn() },
    page: { findUnique: vi.fn(), update: vi.fn() },
    nameClaim: { findUnique: vi.fn(), update: vi.fn() },
    importedContent: { findUnique: vi.fn(), delete: vi.fn() },
    showcaseEntry: { findUnique: vi.fn(), update: vi.fn() },
    user: { findUnique: vi.fn() },
  };
  const revalidatePublicPages = vi.fn();
  return { prisma, revalidatePublicPages };
});

vi.mock("@/lib/db", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/revalidate", () => ({ revalidatePublicPages: mocks.revalidatePublicPages }));

const page = (overrides: Record<string, unknown> = {}) => ({
  id: "p1",
  ownerId: "u2",
  isHub: true,
  path: "amy-ng",
  title: "Amy Ng",
  descriptor: null,
  status: "PENDING",
  publishedAt: null,
  ...overrides,
});

const claim = (overrides: Record<string, unknown> = {}) => ({
  id: "c1",
  slug: "amy-ng",
  status: "CLAIMED",
  type: "STANDARD",
  graceUntil: null,
  ...overrides,
});

const showcase = (overrides: Record<string, unknown> = {}) => ({
  id: "s1",
  domain: "ra-nk.me",
  path: "amy-ng",
  status: "PENDING",
  approvedById: null,
  approvedAt: null,
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.revalidatePublicPages.mockResolvedValue(undefined);
  mocks.prisma.page.findUnique.mockResolvedValue(page());
  mocks.prisma.page.update.mockImplementation(async (args: { data: object }) => {
    return { ...page(), ...args.data };
  });
  mocks.prisma.nameClaim.findUnique.mockResolvedValue(claim());
  mocks.prisma.nameClaim.update.mockImplementation(async (args: { data: object }) => {
    return { ...claim(), ...args.data };
  });
  mocks.prisma.importedContent.findUnique.mockResolvedValue({
    id: "ic1",
    connectorId: "conn1",
    title: "Spammy post",
    url: "https://example.com/spam",
  });
  mocks.prisma.showcaseEntry.findUnique.mockResolvedValue(showcase());
  mocks.prisma.showcaseEntry.update.mockImplementation(async (args: { data: object }) => ({
    ...showcase(),
    ...args.data,
  }));
  mocks.prisma.auditLog.create.mockResolvedValue({ id: "log1" });
});

describe("writeAudit", () => {
  it("writes an audit entry with metadata", async () => {
    await writeAudit("u1", "page.approve", "Page", "p1", { path: "amy-ng" });
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        actorId: "u1",
        action: "page.approve",
        entityType: "Page",
        entityId: "p1",
        metadata: { path: "amy-ng" },
      },
    });
  });
});

describe("setPageStatus", () => {
  it("approves a pending page to LIVE and sets publishedAt", async () => {
    const updated = await setPageStatus("u1", "p1", "LIVE");
    expect(mocks.prisma.page.update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: expect.objectContaining({ status: "LIVE", publishedAt: expect.any(Date) }),
    });
    expect(updated.status).toBe("LIVE");
    expect(mocks.revalidatePublicPages).toHaveBeenCalledWith("amy-ng");
  });

  it("rejects a page and keeps it unpublished", async () => {
    const updated = await setPageStatus("u1", "p1", "REJECTED");
    expect(updated.status).toBe("REJECTED");
    expect(updated.publishedAt).toBeNull();
  });

  it("throws invalid_status for a LIVE page", async () => {
    mocks.prisma.page.findUnique.mockResolvedValue(page({ status: "LIVE" }));
    await expect(setPageStatus("u1", "p1", "REJECTED")).rejects.toThrow("invalid_status");
  });

  it("throws not_found for a missing page", async () => {
    mocks.prisma.page.findUnique.mockResolvedValue(null);
    await expect(setPageStatus("u1", "p1", "LIVE")).rejects.toThrow("not_found");
  });

  it("audits the decision", async () => {
    await setPageStatus("u1", "p1", "LIVE");
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "page.approve", entityType: "Page", entityId: "p1" }),
    });
  });
});

describe("claim release & override", () => {
  it("releases a disputed claim", async () => {
    const updated = await releaseClaim("u1", "c1");
    expect(updated.status).toBe("RELEASED");
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "claim.release", entityType: "NameClaim" }),
    });
  });

  it("throws AdminError for a missing claim", async () => {
    mocks.prisma.nameClaim.findUnique.mockResolvedValue(null);
    await expect(releaseClaim("u1", "c1")).rejects.toBeInstanceOf(AdminError);
  });

  it("overrides a claim to PROTECTED", async () => {
    const updated = await overrideClaimStatus("u1", "c1", "PROTECTED", "restoring premium hold");
    expect(updated.status).toBe("PROTECTED");
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "claim.override" }),
    });
  });
});

describe("import review", () => {
  it("deletes a spam piece of imported content and keeps the connector", async () => {
    await deleteImportedContent("u1", "ic1");
    expect(mocks.prisma.importedContent.delete).toHaveBeenCalledWith({ where: { id: "ic1" } });
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "import.delete", entityType: "ImportedContent" }),
    });
  });

  it("throws not_found for a missing content row", async () => {
    mocks.prisma.importedContent.findUnique.mockResolvedValue(null);
    await expect(deleteImportedContent("u1", "ic1")).rejects.toThrow("not_found");
  });
});

describe("showcase curation", () => {
  it("approves a showcase entry and stamps the approving admin + timestamp", async () => {
    const updated = await setShowcaseStatus("u1", "s1", "LIVE");
    expect(updated.status).toBe("LIVE");
    expect(updated.approvedById).toBe("u1");
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "showcase.approve", entityType: "ShowcaseEntry" }),
    });
  });

  it("rejects a showcase entry", async () => {
    const updated = await setShowcaseStatus("u1", "s1", "REJECTED");
    expect(updated.status).toBe("REJECTED");
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "showcase.reject" }),
    });
  });
});

describe("admin auth helpers", () => {
  it("returns true when the user has the admin role", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({ id: "u1", isAdmin: true });
    await expect(isAdminUser("u1")).resolves.toBe(true);
    await expect(requireAdminUser("u1")).resolves.toEqual({ id: "u1", isAdmin: true });
  });

  it("returns false/null for a non-admin", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({ id: "u1", isAdmin: false });
    await expect(isAdminUser("u1")).resolves.toBe(false);
    await expect(requireAdminUser("u1")).resolves.toBeNull();
  });

  it("returns false/null for a missing user", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue(null);
    await expect(isAdminUser("u1")).resolves.toBe(false);
    await expect(requireAdminUser("u1")).resolves.toBeNull();
  });
});
