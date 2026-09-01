import { describe, expect, it } from "vitest";
import { FAQ_CATEGORIES, faqItems, filterFaq } from "@/lib/faq";

describe("faq data integrity", () => {
  it("has a healthy set of questions across every category", () => {
    expect(faqItems.length).toBeGreaterThanOrEqual(15);
    for (const category of FAQ_CATEGORIES) {
      expect(faqItems.some((f) => f.category === category)).toBe(true);
    }
  });

  it("every item has a non-empty question, answer, and a known category", () => {
    for (const item of faqItems) {
      expect(item.q.trim().length).toBeGreaterThan(10);
      expect(item.a.trim().length).toBeGreaterThan(40);
      expect(FAQ_CATEGORIES).toContain(item.category);
    }
  });

  it("has no duplicate questions", () => {
    const questions = faqItems.map((f) => f.q.toLowerCase());
    expect(new Set(questions).size).toBe(questions.length);
  });
});

describe("filterFaq", () => {
  it("returns everything for the All category with no query", () => {
    expect(filterFaq(faqItems, "All", "")).toHaveLength(faqItems.length);
  });

  it("filters by category", () => {
    const premium = filterFaq(faqItems, "Premium & pricing", "");
    expect(premium.length).toBeGreaterThan(0);
    expect(premium.every((f) => f.category === "Premium & pricing")).toBe(true);
  });

  it("matches the query against question or answer, case-insensitively", () => {
    const hits = filterFaq(faqItems, "All", "custom domain");
    expect(hits.length).toBeGreaterThan(0);
    expect(
      hits.some(
        (f) =>
          f.q.toLowerCase().includes("custom domain") || f.a.toLowerCase().includes("custom domain")
      )
    ).toBe(true);
  });

  it("combines category and query", () => {
    const hits = filterFaq(faqItems, "Features", "domain");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((f) => f.category === "Features")).toBe(true);
  });

  it("returns an empty list when nothing matches", () => {
    expect(filterFaq(faqItems, "All", "zzzz-no-such-term-zzzz")).toHaveLength(0);
  });
});
