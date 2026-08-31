import { prisma } from "@/lib/db";
import { revalidatePublicPages } from "@/lib/revalidate";
import type { ClaimStatus, PageStatus, ShowcaseStatus } from "@/generated/prisma/client";

/**
 * Admin panel (M9, spec §11 / milestones §3.9):
 *  - Page approvals: DRAFT/PENDING → LIVE/REJECTED
 *  - Name disputes: resolve same-name claims (release one side)
 *  - Import reviews: flag/remove spammy imported content
 *  - Claim overrides: release/reclaim/override slugs manually
 *  - Showcase curation: ra-nk.me featured placements
 *  - Audit log viewer; every action writes an AuditLog row.
 *
 * Every mutating operation is idempotent and returns the fresh row so the
 * console can re-render without a reload.
 */

export class AdminError extends Error {
  constructor(public code: "forbidden" | "not_found" | "invalid_status" | "cannot_delete") {
    super(code);
    this.name = "AdminError";
  }
}

/** Writes an audit-log entry tied to the acting admin (spec §3.9 done-when). */
export async function writeAudit(
  actorId: string,
  action: string,
  entityType: string,
  entityId: string | null,
  metadata?: Record<string, unknown>
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorId,
      action,
      entityType,
      entityId,
      metadata: (metadata ?? {}) as object,
    },
  });
}

/**
 * Page approvals — the core lifecycle. DRAFT or PENDING → LIVE (approve) or
 * REJECTED. Approving sets publishedAt + revalidates the public route;
 * rejecting only marks a review memo (no content deletion).
 */
export async function setPageStatus(
  actorId: string,
  pageId: string,
  status: "LIVE" | "REJECTED",
  note?: string
) {
  const page = await prisma.page.findUnique({ where: { id: pageId } });
  if (!page) throw new AdminError("not_found");
  if (!["DRAFT", "PENDING", "REJECTED"].includes(page.status)) {
    throw new AdminError("invalid_status");
  }

  const updated = await prisma.page.update({
    where: { id: pageId },
    data: {
      status: status as PageStatus,
      publishedAt: status === "LIVE" ? (page.publishedAt ?? new Date()) : page.publishedAt,
    },
  });

  await writeAudit(actorId, status === "LIVE" ? "page.approve" : "page.reject", "Page", pageId, {
    path: page.path,
    note: note ?? undefined,
  });
  revalidatePublicPages(page.path);
  return updated;
}

/** Moves a page forward along DRAFT → PENDING (submits it for review). */
export async function submitPageForReview(actorId: string, pageId: string) {
  const page = await prisma.page.findUnique({ where: { id: pageId } });
  if (!page) throw new AdminError("not_found");
  const updated = await prisma.page.update({
    where: { id: pageId },
    data: { status: "PENDING" as PageStatus },
  });
  await writeAudit(actorId, "page.submit", "Page", pageId, { path: page.path });
  revalidatePublicPages(page.path);
  return updated;
}

/**
 * Name disputes — release a specific claim so another person can take the
 * name. Only releases the slug (sets status RELEASED); pages are left intact
 * so the account history survives.
 */
export async function releaseClaim(actorId: string, claimId: string, note?: string) {
  const claim = await prisma.nameClaim.findUnique({ where: { id: claimId } });
  if (!claim) throw new AdminError("not_found");

  const updated = await prisma.nameClaim.update({
    where: { id: claimId },
    data: { status: "RELEASED" as ClaimStatus, graceUntil: null },
  });
  await writeAudit(actorId, "claim.release", "NameClaim", claimId, {
    slug: claim.slug,
    note: note ?? undefined,
  });
  return updated;
}

/** Claim overrides — manually flip any claim to CLAIMED/PROTECTED status. */
export async function overrideClaimStatus(
  actorId: string,
  claimId: string,
  status: Extract<ClaimStatus, "CLAIMED" | "PROTECTED" | "PENDING_RELEASE" | "RELEASED">,
  note?: string
) {
  const claim = await prisma.nameClaim.findUnique({ where: { id: claimId } });
  if (!claim) throw new AdminError("not_found");
  const updated = await prisma.nameClaim.update({
    where: { id: claimId },
    data: { status },
  });
  await writeAudit(actorId, "claim.override", "NameClaim", claimId, {
    slug: claim.slug,
    to: status,
    note: note ?? undefined,
  });
  return updated;
}

/**
 * Import review (spam) — remove a piece of imported content. The connector
 * row is kept (so the user can re-sync) but the offending entry is deleted.
 */
export async function deleteImportedContent(actorId: string, contentId: string) {
  const content = await prisma.importedContent.findUnique({ where: { id: contentId } });
  if (!content) throw new AdminError("not_found");
  await prisma.importedContent.delete({ where: { id: contentId } });
  await writeAudit(actorId, "import.delete", "ImportedContent", contentId, {
    title: content.title ?? undefined,
    url: content.url,
  });
  return { ok: true };
}

/** Showcase curation — approve/reject a ra-nk.me featured placement. */
export async function setShowcaseStatus(
  actorId: string,
  entryId: string,
  status: Extract<ShowcaseStatus, "LIVE" | "REJECTED">,
  note?: string
) {
  const entry = await prisma.showcaseEntry.findUnique({ where: { id: entryId } });
  if (!entry) throw new AdminError("not_found");

  const updated = await prisma.showcaseEntry.update({
    where: { id: entryId },
    data: {
      status,
      approvedById: actorId,
      approvedAt: status === "LIVE" ? new Date() : entry.approvedAt,
    },
  });
  await writeAudit(
    actorId,
    "showcase." + (status === "LIVE" ? "approve" : "reject"),
    "ShowcaseEntry",
    entryId,
    {
      domain: entry.domain,
      path: entry.path,
      note: note ?? undefined,
    }
  );
  return updated;
}
