import { describe, expect, it, vi, afterEach } from "vitest";
import {
  fetchGitHub,
  fetchRss,
  fetchYouTube,
  githubUserFromUrl,
  parseFeed,
} from "@/lib/imports/fetchers";

afterEach(() => {
  vi.restoreAllMocks();
});

const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Alex's Blog</title>
    <link>https://alex.example.com</link>
    <item>
      <title>Why I Switched to a Static Site</title>
      <link>https://alex.example.com/posts/static-site</link>
      <description><![CDATA[<p>Full text here</p>]]></description>
      <pubDate>Mon, 12 Aug 2024 09:00:00 GMT</pubDate>
    </item>
    <item>
      <title>Designing for Search</title>
      <link>https://alex.example.com/posts/seo</link>
      <description>Short description</description>
      <pubDate>Tue, 13 Aug 2024 10:30:00 GMT</pubDate>
    </item>
    <item>
      <title>No Link</title>
      <guid>https://alex.example.com/posts/guid-only</guid>
      <description>Guid fallback</description>
    </item>
    <item>
      <title>Broken Item</title>
      <description>No URL at all — should be dropped</description>
    </item>
  </channel>
</rss>`;

const atomXml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Atom Feed</title>
  <entry>
    <title>Atom Post</title>
    <link href="https://example.com/atom-1"/>
    <content>Atom content body</content>
    <published>2024-08-14T08:00:00Z</published>
  </entry>
</feed>`;

describe("parseFeed", () => {
  it("parses RSS 2.0 items with CDATA and pubDate", () => {
    const items = parseFeed(rssXml);
    expect(items).toHaveLength(3); // the broken item is dropped
    expect(items[0]).toMatchObject({
      title: "Why I Switched to a Static Site",
      url: "https://alex.example.com/posts/static-site",
      content: "Full text here",
    });
    expect(items[0].publishedAt?.toISOString()).toContain("2024-08-12");
    expect(items[2].url).toBe("https://alex.example.com/posts/guid-only");
  });

  it("parses Atom entries", () => {
    const items = parseFeed(atomXml);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      title: "Atom Post",
      url: "https://example.com/atom-1",
      content: "Atom content body",
    });
    expect(items[0].publishedAt?.toISOString()).toContain("2024-08-14");
  });

  it("returns empty for garbage", () => {
    expect(parseFeed("not xml at all")).toEqual([]);
  });
});

describe("fetchRss", () => {
  it("fetches and parses a live feed", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(rssXml, { status: 200 })));
    const items = await fetchRss("https://alex.example.com/feed.xml");
    expect(items).toHaveLength(3);
  });

  it("throws ImportError on HTTP errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("nope", { status: 500 })));
    await expect(fetchRss("https://alex.example.com/feed.xml")).rejects.toThrow("HTTP 500");
  });

  it("throws on empty feeds", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("<rss><channel></channel></rss>", { status: 200 }))
    );
    await expect(fetchRss("https://alex.example.com/feed.xml")).rejects.toThrow("No posts found");
  });
});

describe("githubUserFromUrl", () => {
  it("extracts the username", () => {
    expect(githubUserFromUrl("https://github.com/sarahchen")).toBe("sarahchen");
    expect(githubUserFromUrl("https://github.com/sarah-chen/")).toBe("sarah-chen");
    expect(githubUserFromUrl("https://example.com/not-github")).toBeNull();
  });
});

describe("fetchGitHub", () => {
  it("fetches repos and maps them to items", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify([
            {
              name: "my-project",
              html_url: "https://github.com/sarah/my-project",
              description: "Cool repo",
            },
            { name: "cli-tool", html_url: "https://github.com/sarah/cli-tool" },
          ]),
          { status: 200 }
        )
      )
    );
    const items = await fetchGitHub("https://github.com/sarah");
    expect(items).toEqual([
      { title: "my-project", url: "https://github.com/sarah/my-project", content: "Cool repo" },
      { title: "cli-tool", url: "https://github.com/sarah/cli-tool", content: "" },
    ]);
  });

  it("rejects non-GitHub URLs", async () => {
    await expect(fetchGitHub("https://example.com")).rejects.toThrow("Not a valid GitHub");
  });
});
describe("fetchYouTube", () => {
  it("throws a clear error when the API key is missing", async () => {
    const { config } = await import("@/lib/config");
    const original = Object.getOwnPropertyDescriptor(config.imports, "youtubeApiKey");
    Object.defineProperty(config.imports, "youtubeApiKey", { get: () => "", configurable: true });
    try {
      await expect(fetchYouTube("https://youtube.com/@alex")).rejects.toThrow(
        "API key not configured"
      );
    } finally {
      if (original) Object.defineProperty(config.imports, "youtubeApiKey", original);
    }
  });

  it("rejects invalid URLs", async () => {
    const { config } = await import("@/lib/config");
    const original = Object.getOwnPropertyDescriptor(config.imports, "youtubeApiKey");
    Object.defineProperty(config.imports, "youtubeApiKey", {
      get: () => "KEY",
      configurable: true,
    });
    try {
      await expect(fetchYouTube("https://example.com")).rejects.toThrow("Not a valid YouTube");
    } finally {
      if (original) Object.defineProperty(config.imports, "youtubeApiKey", original);
    }
  });
});
