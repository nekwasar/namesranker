import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { appendMessage, getAgentState, listPendingApprovals, logWork } from "@/lib/agent/state";
import { parseEnvelope } from "@/lib/agent/envelope";
import { buildAgentReply, ResponderFacts } from "@/lib/agent/responder";

export const runtime = "nodejs";

const bodySchema = z.object({
  content: z.string().trim().min(1).max(4000),
});

async function buildFacts(userId: string): Promise<ResponderFacts> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { firstName: true, plan: true, onboardedAt: true },
  });
  const [
    state,
    claim,
    pages,
    connectorCount,
    syncedProfileCount,
    publishedCount,
    approvals,
    watchedQueryCount,
  ] = await Promise.all([
    getAgentState(userId),
    prisma.nameClaim.findFirst({
      where: { claimedById: userId, status: { in: ["CLAIMED", "PROTECTED", "PENDING_RELEASE"] } },
      select: { slug: true },
    }),
    prisma.page.findMany({
      where: { ownerId: userId, isHub: true },
      select: { path: true, status: true },
      take: 1,
    }),
    prisma.importConnector.count({
      where: { page: { ownerId: userId } },
    }),
    prisma.syncedProfile.count({ where: { userId } }),
    prisma.publishedItem.count({ where: { userId } }),
    listPendingApprovals(userId),
    prisma.watchedQuery.count({ where: { userId, active: true } }),
  ]);

  const hub = pages[0];
  return {
    firstName: user?.firstName ?? undefined,
    plan: user?.plan ?? "FREE",
    hasClaim: Boolean(claim),
    hubLive: hub?.status === "LIVE",
    livePageUrl: hub ? `https://${process.env.BASE_DOMAIN ?? "namesranker.com"}/${hub.path}` : null,
    connectorCount,
    syncedProfileCount,
    publishedCount,
    pendingApprovalCount: approvals.length,
    envelopeConfigured: Boolean(parseEnvelope(state.permissionEnvelope)),
    watchedQueryCount,
  };
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_message" }, { status: 400 });
  }

  const facts = await buildFacts(session.sub);
  const userMessage = await appendMessage(session.sub, "user", parsed.data.content);
  const replyContent = buildAgentReply(parsed.data.content, facts);
  const agentMessage = await appendMessage(session.sub, "agent", replyContent);
  await logWork(session.sub, "chat.message", null, { userMessageId: userMessage.id });

  return NextResponse.json({
    user: {
      id: userMessage.id,
      role: userMessage.role,
      content: userMessage.content,
      createdAt: userMessage.createdAt.toISOString(),
    },
    agent: {
      id: agentMessage.id,
      role: agentMessage.role,
      content: agentMessage.content,
      createdAt: agentMessage.createdAt.toISOString(),
    },
  });
}
