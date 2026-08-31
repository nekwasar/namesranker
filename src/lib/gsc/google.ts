import { config } from "@/lib/config";
import { decryptOauthToken } from "@/lib/gsc/crypto";

/**
 * Google Search Console integration (M11, spec §6 / milestones §3.11).
 *
 * - OAuth2 (web flow) grants the user's consent to read their Search Console
 *   properties, then stores the refresh token (encrypted) on the page link.
 * - Search Analytics: POST /webmasters/v3/sites/{site}/searchAnalytics/query
 *   returns clicks/impressions/CTR/position for a lookback window.
 *
 * Everything is gated to premium users with "deep SEO" (spec §10.2).
 */

const OAUTH_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const OAUTH_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const SEARCH_ANALYTICS_ENDPOINT = (siteUrl: string) =>
  `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;

const GSC_SCOPES = ["https://www.googleapis.com/auth/webmasters.readonly"];

function clientConfig(): { clientId: string; clientSecret: string } {
  const { searchConsoleClientId, searchConsoleClientSecret } = config.google;
  if (!searchConsoleClientId || !searchConsoleClientSecret) {
    throw new Error("GOOGLE_SEARCH_CONSOLE_CLIENT_ID/_SECRET are not configured");
  }
  return { clientId: searchConsoleClientId, clientSecret: searchConsoleClientSecret };
}

/** The OAuth redirect_uri — registered in the Google Cloud console. */
export function gscRedirectUri(): string {
  return `${config.appUrl}/api/settings/gsc/callback`;
}

/** Builds the user consent URL for connecting a Search Console account. */
export function buildAuthUrl(opts: { state: string }): string {
  const { clientId } = clientConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: gscRedirectUri(),
    response_type: "code",
    scope: GSC_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    state: opts.state,
  });
  return `${OAUTH_AUTH_ENDPOINT}?${params.toString()}`;
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
}

/** Exchanges an authorization code for tokens. */
export async function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
  const { clientId, clientSecret } = clientConfig();
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: gscRedirectUri(),
    grant_type: "authorization_code",
  });
  const res = await fetch(OAUTH_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    throw new Error(`Token exchange failed (${res.status}): ${await res.text()}`);
  }
  return (await res.json()) as TokenResponse;
}

/** Refreshes an expired access token using the stored refresh token. */
export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const { clientId, clientSecret } = clientConfig();
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
  });
  const res = await fetch(OAUTH_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    throw new Error(`Token refresh failed (${res.status}): ${await res.text()}`);
  }
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error("Refresh response missing access_token");
  return data.access_token;
}

export interface SearchAnalyticsRow {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  query?: string;
  page?: string;
}

export interface SearchAnalyticsResult {
  rows: SearchAnalyticsRow[];
  totals: { clicks: number; impressions: number; ctr: number; position: number };
  window: { startDate: string; endDate: string };
}

/**
 * Fetches Search Analytics for a property over the lookback window.
 * Uses the stored (decrypted) refresh token. `dimension` = "query" | "page";
 * blank returns aggregate totals only.
 */
export async function fetchSearchAnalytics(params: {
  siteUrl: string;
  accessToken: string;
  startDate: string;
  endDate: string;
  dimension?: "query" | "page";
  rowLimit?: number;
}): Promise<SearchAnalyticsResult> {
  const body: Record<string, unknown> = {
    startDate: params.startDate,
    endDate: params.endDate,
    dimensions: params.dimension ? [params.dimension] : [],
    rowLimit: params.rowLimit ?? 10,
    startRow: 0,
  };

  const res = await fetch(SEARCH_ANALYTICS_ENDPOINT(params.siteUrl), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    // Distinguish auth-expiry (400/401/403) so the UI can prompt re-connect.
    if (res.status === 401 || res.status === 403) {
      const err = new Error("search_console_auth_failed") as Error & { code?: string };
      err.code = "search_console_auth_failed";
      throw err;
    }
    throw new Error(`Search Analytics failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as { rows?: SearchAnalyticsRow[] };
  const rows = data.rows ?? [];
  // Aggregate across the returned rows. When a dimension is requested, Google
  // returns per-query rows; we sum clicks/impressions and average CTR/position.
  const totals: SearchAnalyticsRow = rows.reduce(
    (acc, r) => ({
      clicks: acc.clicks + (r.clicks ?? 0),
      impressions: acc.impressions + (r.impressions ?? 0),
      ctr: acc.ctr + (r.ctr ?? 0),
      position: acc.position + (r.position ?? 0),
    }),
    { clicks: 0, impressions: 0, ctr: 0, position: 0 }
  );
  totals.ctr = rows.length ? totals.ctr / rows.length : 0;
  totals.position = rows.length ? totals.position / rows.length : 0;

  return {
    rows,
    totals,
    window: { startDate: params.startDate, endDate: params.endDate },
  };
}

/** Convenience for the DB side: decrypt a stored token then fetch analytics. */
export function decryptToken(payload: string): string {
  return decryptOauthToken(payload);
}
