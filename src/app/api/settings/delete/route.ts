import { NextResponse } from "next/server";
import { getSession, clearSessionCookie } from "@/lib/auth/session";
import { deleteAccount } from "@/lib/settings";
import { ClaimError } from "@/lib/claims/claim";

export const runtime = "nodejs";

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  try {
    await deleteAccount(session.sub);
    await clearSessionCookie();
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ClaimError && err.code === "not_found") {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    throw err;
  }
}
