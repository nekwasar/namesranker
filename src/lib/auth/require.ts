import { prisma } from "@/lib/db";
import { getSession, SessionPayload } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export async function requireUser(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

export async function requirePremium(): Promise<SessionPayload> {
  const session = await requireUser();
  if (session.plan !== "PREMIUM") {
    redirect("/pricing");
  }
  return session;
}

/** Admin gate (M9, spec §11). Verifies against the DB role, not the session. */
export async function requireAdmin(): Promise<SessionPayload> {
  const session = await requireUser();
  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { isAdmin: true },
  });
  if (!user?.isAdmin) {
    redirect("/");
  }
  return session;
}
