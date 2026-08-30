import { describe, expect, it } from "vitest";
import { computeSeoScore, countContentSignals } from "@/lib/seo";

describe("computeSeoScore", () => {
  it("scores 0 with no signals", () => {
    expect(
      computeSeoScore({
        metaTitle: null,
        metaDescription: null,
        descriptor: null,
        contentSignals: 0,
      })
    ).toBe(0);
  });

  it("gives full title points for an ideal-length title", () => {
    const score = computeSeoScore({
      metaTitle: "Alex Morgan — Product Designer in Austin, TX",
      metaDescription: null,
      descriptor: null,
      contentSignals: 0,
    });
    expect(score).toBe(40);
  });

  it("gives partial title points for short titles", () => {
    const score = computeSeoScore({
      metaTitle: "Alex Morgan Designer",
      metaDescription: null,
      descriptor: null,
      contentSignals: 0,
    });
    expect(score).toBe(20);
  });

  it("gives partial description points for too-short descriptions", () => {
    const score = computeSeoScore({
      metaTitle: null,
      metaDescription: "Designer in Austin.",
      descriptor: null,
      contentSignals: 0,
    });
    expect(score).toBe(10);
  });

  it("awards descriptor and content-depth points", () => {
    const score = computeSeoScore({
      metaTitle: null,
      metaDescription: null,
      descriptor: "Product Designer",
      contentSignals: 5,
    });
    expect(score).toBe(20); // 10 descriptor + 10 depth (capped at 10)
  });

  it("caps at 100 and floors at 0", () => {
    const perfect = computeSeoScore({
      metaTitle: "Alex Morgan — Product Designer in Austin, TX",
      metaDescription:
        "Alex Morgan is a product designer in Austin, TX with 8 years of experience shipping web and mobile products for startups.",
      descriptor: "Product Designer",
      contentSignals: 6,
    });
    expect(perfect).toBe(100);

    const negative = computeSeoScore({
      metaTitle: null,
      metaDescription: null,
      descriptor: null,
      contentSignals: -3,
    });
    expect(negative).toBe(0);
  });

  it("ignores surrounding whitespace", () => {
    const score = computeSeoScore({
      metaTitle: "  Alex Morgan — Product Designer in Austin, TX  ",
      metaDescription: null,
      descriptor: null,
      contentSignals: 0,
    });
    expect(score).toBe(40);
  });
});

describe("countContentSignals", () => {
  it("counts each non-empty section once", () => {
    expect(
      countContentSignals({
        descriptor: "Product Designer",
        bio: "  ",
        socials: [],
        experience: [{ role: "Senior Designer", company: "Lumen" }],
        projects: [],
        publications: [{ title: "Design Systems", url: "https://x" }],
        testimonials: [{ quote: "Great to work with." }],
      })
    ).toBe(4); // descriptor, experience, publications, testimonials
  });

  it("returns 0 for an empty page", () => {
    expect(countContentSignals({})).toBe(0);
  });
});
