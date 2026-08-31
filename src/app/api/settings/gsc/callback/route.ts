import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth/session";
import { exchangeCodeForTokens } from "@/lib/gsc/google";
import { saveLink } from "@/lib/gsc/links";
import { GSC_STATE_COOKIE } from "@/lib/gsc/constants";

export const runtime = "nodejs";

/**
 * OAuth redirect target (registered in the Google Cloud console as
 * <appUrl>/api/settings/gsc/callback). Verifies the state cookie to prevent
 * CSRF, exchanges the code for a refresh token, and stores it encrypted.
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const error = req.nextUrl.searchParams.get("error");

  const cookieStore = cookies();
  const raw = cookieStore.get(GSC_STATE_COOKIE)?.value;
  cookieStore.delete(GSC_STATE_COOKIE);

  // A callback without our state cookie means it wasn't initiated here.
  const session = await getSession();
  if (!session) {
    return NextResponse.redirect(new URL("/login?callbackUrl=%2Fsettings", req.nextUrl.origin));
  }
  if (!raw) {
    return NextResponse.redirect(new URL("/settings?gsc=error", req.nextUrl.origin));
  }

  let stateData: { state: string; pageId: string; userId: string };
  try {
    stateData = JSON.parse(raw) as { state: string; pageId: string; userId: string };
  } catch {
    return NextResponse.redirect(new URL("/settings?gsc=error", req.nextUrl.origin));
  }

  if (!state || state !== stateData.state || stateData.userId !== session.sub) {
    return NextResponse.redirect(new URL("/settings?gsc=error", req.nextUrl.origin));
  }
  if (error) {
    return NextResponse.redirect(new URL("/settings?gsc=denied", req.nextUrl.origin));
  }
  if (!code) {
    return NextResponse.redirect(new URL("/settings?gsc=error", req.nextUrl.origin));
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    if (!tokens.refresh_token) {
      return NextResponse.redirect(new URL("/settings?gsc=no_refresh", req.nextUrl.origin));
    }
    // propertyUrl is derived from the claimed slug — the property the user must
    // have verified in Search Console. Kept simple here; actual property is
    // user-chosen via the Search Console API in a fuller flow.
    await saveLink({
      userId: session.sub,
      pageId: stateData.pageId,
      propertyUrl: `sc-domain:${process.env.BASE_DOMAIN ?? "namesranker.com"}`,
      refreshToken: tokens.refresh_token,
    });
    return NextResponse.redirect(new URL("/settings?gsc=connected", req.nextUrl.origin));
  } catch {
    return NextResponse.redirect(new URL("/settings?gsc=error", req.nextUrl.origin));
  }
}
