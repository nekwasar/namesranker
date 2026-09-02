import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth/session";
import { exchangeCodeForTokens } from "@/lib/gsc/google";
import { saveLink } from "@/lib/gsc/links";
import { GSC_STATE_COOKIE } from "@/lib/gsc/constants";
import { config } from "@/lib/config";

export const runtime = "nodejs";

// Redirect to the canonical app URL, never req.nextUrl.origin (the container's
// internal 0.0.0.0:3000 must not leak into browsers).
const redirect = (path: string) => NextResponse.redirect(new URL(path, config.appUrl));

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
    return redirect("/login?callbackUrl=%2Fsettings");
  }
  if (!raw) {
    return redirect("/settings?gsc=error");
  }

  let stateData: { state: string; pageId: string; userId: string };
  try {
    stateData = JSON.parse(raw) as { state: string; pageId: string; userId: string };
  } catch {
    return redirect("/settings?gsc=error");
  }

  if (!state || state !== stateData.state || stateData.userId !== session.sub) {
    return redirect("/settings?gsc=error");
  }
  if (error) {
    return redirect("/settings?gsc=denied");
  }
  if (!code) {
    return redirect("/settings?gsc=error");
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    if (!tokens.refresh_token) {
      return redirect("/settings?gsc=no_refresh");
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
    return redirect("/settings?gsc=connected");
  } catch {
    return redirect("/settings?gsc=error");
  }
}
