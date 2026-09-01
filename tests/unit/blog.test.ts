import { describe, expect, it } from "vitest";
import {
  BLOG_CATEGORIES,
  authorLine,
  blogAuthors,
  blogPosts,
  filterPosts,
  formatBlogDate,
  getBlogAuthor,
  getBlogPost,
  postsByAuthor,
} from "@/lib/blog";

describe("blog post data", () => {
  it("has unique slugs and unique titles", () => {
    const slugs = blogPosts.map((p) => p.slug);
    const titles = blogPosts.map((p) => p.title);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it("uses only known categories", () => {
    for (const post of blogPosts) {
      expect(BLOG_CATEGORIES).toContain(post.category);
    }
  });

  it("has parseable dates, excerpts, and at least one author", () => {
    for (const post of blogPosts) {
      expect(Number.isNaN(new Date(`${post.date}T00:00:00Z`).getTime())).toBe(false);
      expect(post.excerpt.length).toBeGreaterThan(20);
      expect(post.authors.length).toBeGreaterThan(0);
      expect(post.body.length).toBeGreaterThan(0);
    }
  });

  it("covers every category tab with at least one post", () => {
    const used = new Set(blogPosts.map((p) => p.category));
    for (const c of BLOG_CATEGORIES) {
      expect(used.has(c), `category ${c} should have a post`).toBe(true);
    }
  });

  it("getBlogPost resolves by slug and misses unknown slugs", () => {
    expect(getBlogPost(blogPosts[0].slug)?.title).toBe(blogPosts[0].title);
    expect(getBlogPost("does-not-exist")).toBeUndefined();
  });

  it("has exactly one featured post, and it is a full article", () => {
    const featured = blogPosts.filter((p) => p.featured);
    expect(featured).toHaveLength(1);
    expect(featured[0].full).toBe(true);
    // A full article should have a substantial body.
    expect(featured[0].body.length).toBeGreaterThanOrEqual(8);
  });

  it("featured post body contains headings and lists (blocks)", () => {
    const featured = blogPosts.find((p) => p.featured)!;
    const headings = featured.body.filter((b) => typeof b === "object" && "h" in b);
    const lists = featured.body.filter((b) => typeof b === "object" && "ul" in b);
    expect(headings.length).toBeGreaterThanOrEqual(3);
    expect(lists.length).toBeGreaterThanOrEqual(1);
    // Every heading and list has non-empty content.
    for (const h of headings) {
      expect((h as { h: string }).h.trim().length).toBeGreaterThan(3);
    }
    for (const l of lists) {
      expect((l as { ul: string[] }).ul.length).toBeGreaterThan(0);
    }
  });
});

describe("authors registry", () => {
  it("has unique slugs and names, and non-empty bios", () => {
    const slugs = blogAuthors.map((a) => a.slug);
    const names = blogAuthors.map((a) => a.name);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(names).size).toBe(names.length);
    for (const a of blogAuthors) {
      expect(a.bio.trim().length).toBeGreaterThan(20);
      expect(a.slug).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it("every post author resolves to a profile (or is the team)", () => {
    const names = new Set(blogAuthors.map((a) => a.name));
    for (const post of blogPosts) {
      for (const author of post.authors) {
        expect(names.has(author.name), `${author.name} should have a profile`).toBe(true);
      }
    }
  });

  it("getBlogAuthor resolves by slug and misses unknown slugs", () => {
    expect(getBlogAuthor("priya-anand")?.name).toBe("Priya Anand");
    expect(getBlogAuthor("does-not-exist")).toBeUndefined();
  });

  it("postsByAuthor returns only that author's posts, newest first", () => {
    const posts = postsByAuthor(getBlogAuthor("mara-voss")!);
    expect(posts.length).toBeGreaterThan(0);
    expect(posts.every((p) => p.authors.some((a) => a.name === "Mara Voss"))).toBe(true);
    const dates = posts.map((p) => p.date);
    expect([...dates].sort().reverse()).toEqual(dates);
  });
});

describe("filterPosts", () => {
  it("returns everything for the All tab with no query", () => {
    expect(filterPosts(blogPosts, "All", "")).toHaveLength(blogPosts.length);
  });

  it("filters by category", () => {
    const engineering = filterPosts(blogPosts, "Engineering", "");
    expect(engineering.length).toBeGreaterThan(0);
    expect(engineering.every((p) => p.category === "Engineering")).toBe(true);
  });

  it("matches title, excerpt, and author names, case-insensitively", () => {
    const byTitle = filterPosts(blogPosts, "All", "search console");
    expect(byTitle.some((p) => p.slug === "search-console-per-page")).toBe(true);

    const byAuthor = filterPosts(blogPosts, "All", "priya nair");
    expect(
      byAuthor.every((p) => p.authors.some((a) => a.name.toLowerCase().includes("priya")))
    ).toBe(true);

    const byCategoryText = filterPosts(blogPosts, "All", "changelog");
    expect(byCategoryText.some((p) => p.category === "Changelog")).toBe(true);
  });

  it("combines category + query and returns empty for no matches", () => {
    expect(filterPosts(blogPosts, "Security", "search console")).toHaveLength(0);
    expect(filterPosts(blogPosts, "All", "zzzz-no-such-term")).toHaveLength(0);
  });
});

describe("authorLine", () => {
  it("handles one, two, and three-plus authors", () => {
    expect(authorLine([{ name: "A" }])).toBe("A");
    expect(authorLine([{ name: "A" }, { name: "B" }])).toBe("A and B");
    expect(authorLine([{ name: "A" }, { name: "B" }, { name: "C" }])).toBe("A, B, and 1 other");
    expect(authorLine([{ name: "A" }, { name: "B" }, { name: "C" }, { name: "D" }])).toBe(
      "A, B, and 2 others"
    );
  });

  it("returns empty for no authors", () => {
    expect(authorLine([])).toBe("");
  });
});

describe("formatBlogDate", () => {
  it("renders day + full month", () => {
    expect(formatBlogDate("2026-08-25")).toBe("25 August");
    expect(formatBlogDate("2026-01-03")).toBe("3 January");
  });
});
