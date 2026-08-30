import { describe, expect, it } from "vitest";
import {
  claimableSlugs,
  countWords,
  isValidCustomSlug,
  MAX_NUMBERED_VARIANT,
  normalizeName,
  RESERVED_SLUGS,
  slugify,
} from "@/lib/claims/slug";

describe("normalizeName", () => {
  it("trims and lowercases", () => {
    expect(normalizeName("  John SMITH  ")).toBe("john smith");
  });

  it("collapses internal whitespace", () => {
    expect(normalizeName("Mary   Jane  Watson")).toBe("mary jane watson");
  });

  it("strips diacritics via unicode normalization (Beyoncé → beyonce)", () => {
    expect(normalizeName("Beyoncé")).toBe("beyonce");
    expect(normalizeName("Sébastien Müller")).toBe("sebastien muller");
  });
});

describe("countWords", () => {
  it("counts one-word names", () => {
    expect(countWords("Beyoncé")).toBe(1);
    expect(countWords("  Adele  ")).toBe(1);
  });

  it("counts two-word and multi-word names", () => {
    expect(countWords("John Smith")).toBe(2);
    expect(countWords("Mary Jane Watson")).toBe(3);
  });

  it("returns 0 for empty input", () => {
    expect(countWords("")).toBe(0);
    expect(countWords("   ")).toBe(0);
  });
});

describe("slugify", () => {
  it("produces first-last base slugs", () => {
    expect(slugify("John Smith")).toBe("john-smith");
    expect(slugify("Mary Jane Watson")).toBe("mary-jane-watson");
  });

  it("handles unicode and diacritics", () => {
    expect(slugify("Beyoncé")).toBe("beyonce");
  });

  it("replaces punctuation with single hyphens", () => {
    expect(slugify("Jean-Luc O'Brien")).toBe("jean-luc-o-brien");
    expect(slugify("Ann-Marie & John")).toBe("ann-marie-john");
  });

  it("collapses runs of non-alphanumerics and trims hyphens", () => {
    expect(slugify("  John---Smith  ")).toBe("john-smith");
  });

  it("returns empty string for names with no slug-able characters", () => {
    expect(slugify("!!!")).toBe("");
  });
});

describe("claimableSlugs", () => {
  it("returns just the base slug without a keyword", () => {
    expect(claimableSlugs("john-smith")).toEqual(["john-smith"]);
  });

  it("builds the full chain first-last → first-last-keyword → numbered variants", () => {
    const chain = claimableSlugs("john-smith", "codes");
    expect(chain[0]).toBe("john-smith");
    expect(chain[1]).toBe("john-smith-codes");
    expect(chain[2]).toBe("john-smith-codes-2");
    expect(chain[3]).toBe("john-smith-codes-3");
    expect(chain.length).toBe(1 + MAX_NUMBERED_VARIANT); // base + keyword + 2..10
    expect(chain[chain.length - 1]).toBe(`john-smith-codes-${MAX_NUMBERED_VARIANT}`);
  });
});

describe("isValidCustomSlug", () => {
  it("accepts clean lowercase handle slugs", () => {
    expect(isValidCustomSlug("j-smith")).toBe(true);
    expect(isValidCustomSlug("john-smith-dev")).toBe(true);
    expect(isValidCustomSlug("jsmith2")).toBe(true);
  });

  it("rejects uppercase, symbols, and malformed hyphens", () => {
    expect(isValidCustomSlug("John")).toBe(false);
    expect(isValidCustomSlug("john_smith")).toBe(false);
    expect(isValidCustomSlug("-john")).toBe(false);
    expect(isValidCustomSlug("john-")).toBe(false);
    expect(isValidCustomSlug("jo--hn")).toBe(false);
    expect(isValidCustomSlug("john smith")).toBe(false);
  });

  it("rejects out-of-range lengths", () => {
    expect(isValidCustomSlug("ab")).toBe(false); // too short
    expect(isValidCustomSlug("a".repeat(51))).toBe(false); // too long
  });

  it("rejects reserved slugs (app routes)", () => {
    expect(isValidCustomSlug("admin")).toBe(false);
    expect(isValidCustomSlug("names")).toBe(false);
    expect(isValidCustomSlug("pricing")).toBe(false);
    expect(isValidCustomSlug("settings")).toBe(false);
    expect(RESERVED_SLUGS.has("api")).toBe(true);
  });
});
