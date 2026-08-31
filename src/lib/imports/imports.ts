import { prisma } from "@/lib/db";
import { revalidatePublicPages } from "@/lib/revalidate";
import { fetchByType, ImportError, type ImportedItem } from "@/lib/imports/fetchers";
import type { ContentBlockType, ImportConnectorType } from "@/generated/prisma/client";

/**
 * Import-connector sync (M7, spec §5.1 / milestones §3.8).
 * Fetch external content (RSS/GitHub/YouTube), persist ImportedContent rows
 * (deduped by URL), and render them onto the page as ContentBlocks so the
 * public page shows real imported sections. Failures are logged + surfaced
 * via the sync result (and the settings UI), never crash the cron.
 */

const MAX_BLOCKS = 10;

export interface SyncResult {
  connectorId: string;
  ok: boolean;
  fetched: number;
  imported: number;
  skippedDuplicates: number;
  error?: string;
}

/** Which ContentBlock type + payload shape each connector type maps to. */
function blockShapeFor(type: ImportConnectorType): {
  type: ContentBlockType;
  toPayload: (item: ImportedItem) => Record<string, unknown>;
} {
  switch (type) {
    case "RSS":
      return {
        type: "PUBLICATION",
        toPayload: (item) => ({ title: item.title, url: item.url, publisher: "Blog" }),
      };
    case "GITHUB":
      return {
        type: "PROJECT",
        toPayload: (item) => ({ title: item.title, url: item.url, description: item.content }),
      };
    case "YOUTUBE":
      return {
        type: "PUBLICATION",
        toPayload: (item) => ({ title: item.title, url: item.url, publisher: "YouTube" }),
      };
  }
}

/**
 * Sync a single connector: fetch → dedupe against ImportedContent by URL →
 * persist new items → rewrite the page's imported blocks.
 */
export async function syncConnector(connectorId: string): Promise<SyncResult> {
  const connector = await prisma.importConnector.findUnique({
    where: { id: connectorId },
    include: { page: { select: { path: true } } },
  });
  if (!connector) throw new ImportError("not_found", "Connector not found");

  const base: SyncResult = { connectorId, ok: true, fetched: 0, imported: 0, skippedDuplicates: 0 };
  try {
    const items = await fetchByType(connector.type, connector.externalUrl);
    base.fetched = items.length;
    if (items.length === 0) {
      await markSynced(connector.id, connector.page.path);
      return base;
    }

    // Dedupe against previously imported URLs for this connector.
    const existing = await prisma.importedContent.findMany({
      where: { connectorId },
      select: { url: true },
    });
    const seen = new Set(existing.map((e) => e.url));
    const fresh = items.filter((i) => !seen.has(i.url));
    base.skippedDuplicates = items.length - fresh.length;

    if (fresh.length > 0) {
      await prisma.importedContent.createMany({
        data: fresh.map((i) => ({
          connectorId,
          title: i.title,
          url: i.url,
          content: i.content ?? null,
          publishedAt: i.publishedAt ?? null,
        })),
      });
      base.imported = fresh.length;
    }

    await rewriteImportedBlocks(connector.id);
    await markSynced(connector.id, connector.page.path);
    return base;
  } catch (err) {
    const message = err instanceof ImportError ? err.message : "Sync failed";
    base.ok = false;
    base.error = message;
    console.error(`[imports] connector ${connectorId} (${connector.type}):`, err);
    return base;
  }
}

/** Rewrite this connector's ContentBlocks from its ImportedContent rows. */
async function rewriteImportedBlocks(connectorId: string) {
  const connector = await prisma.importConnector.findUnique({
    where: { id: connectorId },
    select: { id: true, type: true, pageId: true },
  });
  if (!connector) return;

  const rows = await prisma.importedContent.findMany({
    where: { connectorId },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: MAX_BLOCKS,
  });
  const shape = blockShapeFor(connector.type);

  // Remove only the blocks this connector previously wrote (marker in payload).
  const existing = await prisma.contentBlock.findMany({
    where: { pageId: connector.pageId },
    select: { id: true, payload: true },
  });
  const staleIds = existing
    .filter((b) => (b.payload as { importedFrom?: string }).importedFrom === connectorId)
    .map((b) => b.id);
  if (staleIds.length > 0) {
    await prisma.contentBlock.deleteMany({ where: { id: { in: staleIds } } });
  }

  // Find the insertion offset: after the highest existing order (content stays above imports).
  const maxOrder = await prisma.contentBlock.aggregate({
    where: { pageId: connector.pageId },
    _max: { order: true },
  });
  let order = (maxOrder._max.order ?? -1) + 1;

  if (rows.length > 0) {
    await prisma.contentBlock.createMany({
      data: rows.map((row) => ({
        pageId: connector.pageId,
        type: shape.type,
        payload: {
          ...shape.toPayload({
            title: row.title,
            url: row.url,
            content: row.content ?? undefined,
            publishedAt: row.publishedAt ?? undefined,
          }),
          importedFrom: connectorId,
        },
        order: order++,
      })),
    });
  }
}

async function markSynced(connectorId: string, pagePath: string) {
  await prisma.importConnector.update({
    where: { id: connectorId },
    data: { lastSyncedAt: new Date() },
  });
  revalidatePublicPages(pagePath);
}

/** Sync all connectors flagged for auto-sync (premium) — used by the cron. */
export async function syncAutoConnectors(): Promise<{ synced: number; failed: number }> {
  const connectors = await prisma.importConnector.findMany({
    where: { autoSync: true },
    select: { id: true },
  });
  let failed = 0;
  for (const c of connectors) {
    const result = await syncConnector(c.id);
    if (!result.ok) failed++;
  }
  return { synced: connectors.length - failed, failed };
}

/** Sync every connector on one page (manual "sync now"). */
export async function syncPageConnectors(pageId: string): Promise<SyncResult[]> {
  const connectors = await prisma.importConnector.findMany({
    where: { pageId },
    select: { id: true },
  });
  const results: SyncResult[] = [];
  for (const c of connectors) {
    results.push(await syncConnector(c.id));
  }
  return results;
}
