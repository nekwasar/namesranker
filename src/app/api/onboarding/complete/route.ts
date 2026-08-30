import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { completeOnboarding } from "@/lib/onboarding";

export const runtime = "nodejs";

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  try {
    const { path, url } = await completeOnboarding(session.sub);
    return NextResponse.json({ ok: true, path, url });
  } catch {
    return NextResponse.json({ error: "no_claim" }, { status: 409 });
  }
}
