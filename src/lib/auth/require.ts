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
