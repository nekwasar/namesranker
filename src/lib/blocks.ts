import { prisma } from "@/lib/db";
import type { ContentBlockType, Prisma } from "@/generated/prisma/client";

/**
 * Shared page + ContentBlock helpers (M5 onboarding / M6 settings).
 * Both flows replace a section's blocks wholesale on save (idempotent),
 * preserving `order` from the array index.
 */

const pageInclude = {
  blocks: { orderBy: { order: "asc" as const } },
  connectors: true,
} as const;

export type PageWithContent = Awaited<ReturnType<typeof getOwnerPage>>;

export async function getOwnerPage(userId: string, pageId: string) {
  return prisma.page.findFirst({
    where: { id: pageId, ownerId: userId },
    include: pageInclude,
  });
}

export async function getOwnerPages(userId: string) {
  return prisma.page.findMany({
    where: { ownerId: userId },
    include: pageInclude,
    orderBy: [{ isHub: "desc" }, { path: "asc" }],
  });
}

export async function getHubPage(userId: string) {
  return prisma.page.findFirst({
    where: { ownerId: userId, isHub: true },
    include: pageInclude,
  });
}

export function blockOfType(
  page: { blocks: { type: string; payload: Prisma.JsonValue }[] },
  type: string
): Prisma.JsonObject | undefined {
  return page.blocks.find((b) => b.type === type)?.payload as Prisma.JsonObject | undefined;
}

export function listOfType(
  page: { blocks: { type: string; payload: Prisma.JsonValue }[] },
  type: string
): Prisma.JsonObject[] {
  return page.blocks.filter((b) => b.type === type).map((b) => b.payload as Prisma.JsonObject);
}

export async function replaceBlocks(
  pageId: string,
  types: ContentBlockType[],
  blocks: { type: ContentBlockType; payload: Prisma.InputJsonValue }[]
): Promise<void> {
  await prisma.contentBlock.deleteMany({ where: { pageId, type: { in: types } } });
  if (blocks.length > 0) {
    await prisma.contentBlock.createMany({
      data: blocks.map((b, i) => ({ pageId, type: b.type, payload: b.payload, order: i })),
    });
  }
}
