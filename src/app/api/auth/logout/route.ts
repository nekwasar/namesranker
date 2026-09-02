import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth/session";
import { config } from "@/lib/config";

export const runtime = "nodejs";

export async function POST() {
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.redirect(new URL("/login", config.appUrl));
}
