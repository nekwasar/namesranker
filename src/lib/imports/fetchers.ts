import { config } from "@/lib/config";

/**
 * Import-connector fetchers (M7, spec §5.1 / milestones §3.8):
 * - RSS/Atom: full-text posts (strong SEO content)
 * - GitHub REST API: public repos as projects
 * - YouTube Data API: latest channel uploads
 * Each fetcher returns normalized items; failures throw ImportError with a
 * user-safe message so syncs can log + surface errors without crashing.
 */

export class ImportError extends Error {
  constructor(
    public code: string,
    message?: string
  ) {
    super(message ?? code);
    this.name = "ImportError";
  }
}

export interface ImportedItem {
  title: string;
  url: string;
  content?: string;
  publishedAt?: Date;
}

const FETCH_TIMEOUT_MS = 15_000;
const MAX_ITEMS = 10;

async function fetchText(url: string, init?: RequestInit): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        "user-agent": "NamesRanker/1.0 (+https://namesranker.com)",
        ...init?.headers,
      },
    });
    if (!res.ok) {
      throw new ImportError("fetch_failed", `Upstream returned HTTP ${res.status}`);
    }
    return await res.text();
  } catch (err) {
    if (err instanceof ImportError) throw err;
    throw new ImportError("fetch_failed", err instanceof Error ? err.message : "Network error");
  } finally {
    clearTimeout(timer);
  }
}

/* ---------------- RSS / Atom ---------------- */

/** Extract a CDATA-wrapped or raw text node between tags. */
function nodeText(block: string, tag: string): string {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = block.match(re);
  if (!m) return "";
  return m[1]
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** Parse RSS 2.0 (`<item>`) or Atom (`<entry>`) into normalized items. */
export function parseFeed(xml: string): ImportedItem[] {
  const isAtom = /<feed[\s>]/i.test(xml);
  const entryRe = isAtom ? /<entry[\s>][\s\S]*?<\/entry>/gi : /<item[\s>][\s\S]*?<\/item>/gi;

  const items: ImportedItem[] = [];
  for (const block of xml.match(entryRe) ?? []) {
    const title = nodeText(block, "title");
    // Atom links are self-closing `<link href="…"/>`; RSS links have text content.
    const url = isAtom
      ? (block.match(/<link\s[^>]*href=["']([^"']+)["']/i)?.[1] ?? "")
      : nodeText(block, "link").trim() || nodeText(block, "guid").trim();
    if (!title || !url) continue;

    const content = isAtom
      ? nodeText(block, "content") || nodeText(block, "summary")
      : nodeText(block, "description") || nodeText(block, "content:encoded");

    const dateRaw = nodeText(block, isAtom ? "published" : "pubDate") || nodeText(block, "updated");
    const publishedAt = dateRaw ? new Date(dateRaw) : undefined;

    items.push({
      title,
      url: url.startsWith("http") ? url : "",
      content,
      publishedAt: publishedAt && !Number.isNaN(publishedAt.getTime()) ? publishedAt : undefined,
    });
  }
  return items.filter((i) => i.url).slice(0, MAX_ITEMS);
}

/** Fetch + parse an RSS/Atom feed URL. */
export async function fetchRss(url: string): Promise<ImportedItem[]> {
  const xml = await fetchText(url);
  const items = parseFeed(xml);
  if (items.length === 0) throw new ImportError("empty_feed", "No posts found in feed");
  return items;
}

/* ---------------- GitHub ---------------- */

/** Extract a GitHub username from a profile URL (https://github.com/<user>). */
export function githubUserFromUrl(url: string): string | null {
  const m = url.match(/github\.com\/([a-zA-Z0-9-]+)/i);
  return m ? m[1] : null;
}

/** Fetch public repos for a GitHub user via the REST API. */
export async function fetchGitHub(url: string): Promise<ImportedItem[]> {
  const user = githubUserFromUrl(url);
  if (!user) throw new ImportError("invalid_url", "Not a valid GitHub profile URL");

  const headers: Record<string, string> = {
    accept: "application/vnd.github+json",
  };
  if (config.imports.githubToken) headers.authorization = `Bearer ${config.imports.githubToken}`;

  const body = await fetchText(
    `https://api.github.com/users/${user}/repos?sort=updated&per_page=${MAX_ITEMS}`,
    {
      headers,
    }
  );
  const repos = JSON.parse(body) as {
    name?: string;
    html_url?: string;
    description?: string | null;
  }[];
  if (!Array.isArray(repos))
    throw new ImportError("invalid_response", "Unexpected GitHub response");

  return repos
    .filter((r) => r.name && r.html_url)
    .map((r) => ({
      title: r.name as string,
      url: r.html_url as string,
      content: r.description ?? "",
    }));
}

/* ---------------- YouTube ---------------- */

/** Extract a channel id or handle from a YouTube channel URL. */
function youtubeChannelRef(url: string): { id?: string; handle?: string } | null {
  const byId = url.match(/youtube\.com\/channel\/([a-zA-Z0-9_-]+)/i);
  if (byId) return { id: byId[1] };
  const byHandle = url.match(/youtube\.com\/@([a-zA-Z0-9_.-]+)/i);
  if (byHandle) return { handle: byHandle[1] };
  return null;
}

/** Fetch the latest uploads for a YouTube channel via the Data API v3. */
export async function fetchYouTube(url: string): Promise<ImportedItem[]> {
  const apiKey = config.imports.youtubeApiKey;
  if (!apiKey) throw new ImportError("missing_key", "YouTube API key not configured");

  const ref = youtubeChannelRef(url);
  if (!ref) throw new ImportError("invalid_url", "Not a valid YouTube channel URL");

  const base = "https://www.googleapis.com/youtube/v3";
  const channelId = ref.id
    ? ref.id
    : await (async () => {
        const res = await fetchText(
          `${base}/channels?part=id&forHandle=${encodeURIComponent(ref.handle as string)}&key=${apiKey}`
        );
        const data = JSON.parse(res) as { items?: { id?: string }[] };
        return data.items?.[0]?.id ?? "";
      })();
  if (!channelId) throw new ImportError("not_found", "Channel not found");

  const body = await fetchText(
    `${base}/search?part=snippet&channelId=${encodeURIComponent(channelId)}&type=video&order=date&maxResults=${MAX_ITEMS}&key=${apiKey}`
  );
  const data = JSON.parse(body) as {
    items?: {
      id?: { videoId?: string };
      snippet?: { title?: string; description?: string; publishedAt?: string };
    }[];
  };

  return (data.items ?? [])
    .filter((v) => v.id?.videoId && v.snippet?.title)
    .map((v) => ({
      title: v.snippet?.title as string,
      url: `https://www.youtube.com/watch?v=${v.id?.videoId}`,
      content: v.snippet?.description ?? "",
      publishedAt: v.snippet?.publishedAt ? new Date(v.snippet.publishedAt) : undefined,
    }));
}

/** Dispatch by connector type. */
export async function fetchByType(
  type: "RSS" | "GITHUB" | "YOUTUBE",
  externalUrl: string
): Promise<ImportedItem[]> {
  switch (type) {
    case "RSS":
      return fetchRss(externalUrl);
    case "GITHUB":
      return fetchGitHub(externalUrl);
    case "YOUTUBE":
      return fetchYouTube(externalUrl);
  }
}
