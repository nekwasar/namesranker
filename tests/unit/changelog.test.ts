import { describe, expect, it } from "vitest";
import { changelogEntries, getChangelogEntry, relatedPost } from "@/lib/changelog";
import { getBlogPost } from "@/lib/blog";

describe("changelog data", () => {
  it("has unique versions and entries sorted newest first", () => {
    const versions = changelogEntries.map((e) => e.version);
    expect(new Set(versions).size).toBe(versions.length);
    const dates = changelogEntries.map((e) => e.date);
    const sorted = [...dates].sort((a, b) => b.localeCompare(a));
    expect(dates).toEqual(sorted);
  });

  it("has complete entries", () => {
    expect(changelogEntries.length).toBeGreaterThan(5);
    for (const entry of changelogEntries) {
      expect(Number.isNaN(new Date(`${entry.date}T00:00:00Z`).getTime())).toBe(false);
      expect(entry.title.trim().length).toBeGreaterThan(3);
      expect(entry.description.trim().length).toBeGreaterThan(20);
      expect(["Feature", "Improvement", "Fix", "Security"]).toContain(entry.tag);
    }
  });

  it("every related post slug resolves to a real blog post", () => {
    for (const entry of changelogEntries) {
      if (entry.relatedPostSlug) {
        expect(getBlogPost(entry.relatedPostSlug), entry.relatedPostSlug).toBeDefined();
      }
    }
  });

  it("relatedPost returns the post or undefined", () => {
    const withPost = changelogEntries.find((e) => e.relatedPostSlug)!;
    expect(withPost).toBeDefined();
    expect(relatedPost(withPost)?.slug).toBe(withPost.relatedPostSlug);
    const without = changelogEntries.find((e) => !e.relatedPostSlug)!;
    expect(without).toBeDefined();
    expect(relatedPost(without)).toBeUndefined();
  });

  it("getChangelogEntry resolves by version", () => {
    expect(getChangelogEntry(changelogEntries[0].version)?.title).toBe(changelogEntries[0].title);
    expect(getChangelogEntry("v99.0")).toBeUndefined();
  });
});
