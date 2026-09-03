import { prisma } from "@/lib/db";
import { DEFAULT_ENVELOPE, parseEnvelope, PermissionEnvelope } from "./envelope";

/**
 * Per-user agent state access (M1 shell; M3 runtime grows on top).
 *
 * One `AgentState` row per user, created lazily the first time a member hits
 * the v2 surface (chat/profile/settings). The permission envelope and the
 * welcome message are seeded exactly once.
 */

export interface MessageRow {
  id: string;
  role: string;
  content: string;
  createdAt: Date;
}

export async function ensureAgentState(userId: string): Promise<{ created: boolean }> {
  const existing = await prisma.agentState.findUnique({ where: { userId } });
  if (existing) return { created: false };

  await prisma.agentState.create({
    data: {
      userId,
      permissionEnvelope: DEFAULT_ENVELOPE as unknown as object,
    },
  });

  // First visit → seed the welcome message so the chat opens with the agent
  // speaking, exactly as M1's landing experience intends.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { firstName: true, onboardedAt: true },
  });
  const firstName = user?.firstName?.trim() || undefined;
  await seedGreeting(userId, { firstName, onboarded: Boolean(user?.onboardedAt) });
  return { created: true };
}

function seedGreeting(
  userId: string,
  ctx: { firstName?: string; onboarded: boolean }
): Promise<MessageRow> {
  const name = ctx.firstName ? ` ${ctx.firstName}` : "";
  const claimNote = ctx.onboarded
    ? " I can already see you've set up your page — well done."
    : " When you're ready, claim your name and publish your hub page — then I can start building on it.";
  const content =
    `Hi${name} — I'm your personal ranking agent. This chat is where all the work happens: ` +
    `I study your work, publish it across the web, pitch you to podcasts and publications, ` +
    `and track how your name ranks on Google.${claimNote}\n\n` +
    `I've set up my permission envelope — the rules for what I may do — using the safest ` +
    `defaults. You can review and change them any time in Settings → Permissions.\n\n` +
    `Next up, I'll need your resume so I can map your footprint and bring you a day-one plan. ` +
    `Until then, ask me anything — for example “what can you do?” or “what's my status?”.`;
  return appendMessage(userId, "agent", content);
}

export async function getAgentState(userId: string) {
  await ensureAgentState(userId);
  return prisma.agentState.findUniqueOrThrow({ where: { userId } });
}

export async function getEnvelope(userId: string): Promise<PermissionEnvelope> {
  const state = await getAgentState(userId);
  return parseEnvelope(state.permissionEnvelope);
}

export async function setEnvelope(
  userId: string,
  envelope: PermissionEnvelope
): Promise<PermissionEnvelope> {
  const state = await getAgentState(userId);
  await prisma.agentState.update({
    where: { id: state.id },
    data: { permissionEnvelope: envelope as unknown as object },
  });
  return envelope;
}

export async function appendMessage(
  userId: string,
  role: "user" | "agent" | "system",
  content: string,
  toolCalls?: object
): Promise<MessageRow> {
  const row = await prisma.conversationMessage.create({
    data: {
      userId,
      role,
      content,
      toolCalls: toolCalls ?? undefined,
    },
    select: { id: true, role: true, content: true, createdAt: true },
  });
  return row;
}

/** Chronological message history for the chat view. */
export async function listMessages(userId: string, limit = 200): Promise<MessageRow[]> {
  const rows = await prisma.conversationMessage.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: { id: true, role: true, content: true, createdAt: true },
  });
  return rows;
}

/** Pending approvals awaiting one-tap sign-off, newest first. */
export async function listPendingApprovals(userId: string) {
  return prisma.approvalItem.findMany({
    where: { userId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      kind: true,
      title: true,
      summary: true,
      createdAt: true,
    },
  });
}

export async function decideApproval(
  userId: string,
  approvalId: string,
  action: "approve" | "reject"
): Promise<boolean> {
  const item = await prisma.approvalItem.findFirst({
    where: { id: approvalId, userId, status: "PENDING" },
    select: { id: true },
  });
  if (!item) return false;

  await prisma.approvalItem.update({
    where: { id: item.id },
    data: { status: action === "approve" ? "APPROVED" : "REJECTED", decidedAt: new Date() },
  });
  await logWork(userId, action === "approve" ? "approval.approved" : "approval.rejected", null, {
    approvalId,
  });
  return true;
}

/** Immutable audit trail shown in the chat activity feed. */
export async function logWork(
  userId: string,
  action: string,
  tool: string | null,
  metadata?: Record<string, unknown>
): Promise<void> {
  await prisma.workLog.create({
    data: {
      userId,
      action,
      tool: tool ?? undefined,
      status: "ok",
      metadata: metadata ? (metadata as object) : undefined,
    },
  });
}

export async function listWork(userId: string, limit = 30) {
  return prisma.workLog.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      action: true,
      tool: true,
      status: true,
      createdAt: true,
    },
  });
}
