import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

const PROTECTED_PREFIXES = ["/settings", "/onboarding", "/admin"];

// Canonical origin for auth redirects — never req.nextUrl.origin, which can
// resolve to the container's internal 0.0.0.0:3000 behind a reverse proxy.
const APP_ORIGIN = process.env.NEXTAUTH_URL ?? "https://namesranker.com";

const BASE_HOSTS = new Set(["namesranker.com", "ra-nk.me", "ra-nk.co", "localhost", "127.0.0.1"]);

/** A bare IP literal (IPv4, or IPv6 containing colons) is a direct host, never a custom domain. */
function isIpAddress(host: string): boolean {
  if (host.includes(":")) return true; // IPv6
  return /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/.test(host);
}

/**
 * 1) Custom-domain rewrite (spec §3.5): requests whose Host isn't the base
 *    domain are sent to `/cdom/{host}/{path}` where the dynamic route resolves
 *    the host to its verified page (404 if unverified/unknown).
 * 2) Auth guard for protected prefixes on the base domain.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Trust x-forwarded-host (proxies/Vercel) over the raw Host header.
  const hostHeader =
    req.headers.get("x-forwarded-host")?.toLowerCase() ??
    req.headers.get("host")?.toLowerCase() ??
    "";
  // Strip a single :port suffix, but keep IPv6 literals (which contain colons) whole.
  const host = (hostHeader.match(/:/g) ?? []).length <= 1 ? hostHeader.split(":")[0] : hostHeader;

  const isBaseHost =
    !host || BASE_HOSTS.has(host) || host.endsWith(".namesranker.com") || isIpAddress(host);

  if (!isBaseHost) {
    const url = req.nextUrl.clone();
    url.pathname = `/cdom/${host}${pathname === "/" ? "" : pathname}`;
    return NextResponse.rewrite(url);
  }

  const needsAuth = PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!needsAuth) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    const loginUrl = new URL("/login", APP_ORIGIN);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
