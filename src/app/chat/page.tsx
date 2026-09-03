import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/require";
import { MemberShell, MemberPageHeader } from "@/components/member/member-shell";
import ChatView from "@/components/member/chat-view";
import { ensureAgentState, listMessages, listPendingApprovals, listWork } from "@/lib/agent/state";

export const metadata: Metadata = {
  title: "Your agent — NamesRanker",
  description: "Your personal ranking agent — chat is where all the work happens.",
};

export default async function ChatPage() {
  const session = await requireUser();
  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { firstName: true },
  });

  await ensureAgentState(session.sub);
  const [messages, approvals, work] = await Promise.all([
    listMessages(session.sub),
    listPendingApprovals(session.sub),
    listWork(session.sub, 12),
  ]);

  const initials = messages.map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    createdAt: m.createdAt.toISOString(),
  }));
  const approvalsInitial = approvals.map((a) => ({
    id: a.id,
    kind: a.kind,
    title: a.title,
    summary: a.summary,
    createdAt: a.createdAt.toISOString(),
  }));
  const workInitial = work.map((w) => ({
    id: w.id,
    action: w.action,
    status: w.status,
    createdAt: w.createdAt.toISOString(),
  }));

  return (
    <MemberShell active="chat" email={session.email}>
      <MemberPageHeader
        eyebrow="Your workspace"
        title="Your agent"
        subtitle="Everything happens here — I study your work, publish it across the web, pitch you to podcasts and publications, and track how your name ranks on Google. Ask me anything, or approve what I bring you."
      />
      <ChatView
        initialMessages={initials}
        initialApprovals={approvalsInitial}
        initialWork={workInitial}
        firstName={user?.firstName ?? null}
      />
    </MemberShell>
  );
}
