import { describe, expect, it } from "vitest";
import { getUseCase, useCases } from "@/lib/usecases";

describe("use-case data integrity", () => {
  it("has a healthy set of use cases with unique slugs", () => {
    expect(useCases.length).toBeGreaterThanOrEqual(4);
    const slugs = useCases.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const c of useCases) {
      expect(c.slug).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it("every use case has complete story content", () => {
    for (const c of useCases) {
      expect(c.audience.trim().length).toBeGreaterThan(3);
      expect(c.tagline.trim().length).toBeGreaterThan(10);
      expect(c.summary.trim().length).toBeGreaterThan(20);
      expect(c.outcome.trim().length).toBeGreaterThan(10);
      expect(c.scenario.trim().length).toBeGreaterThan(10);
      expect(c.challenges.length).toBeGreaterThanOrEqual(2);
      expect(c.howItWorks.length).toBeGreaterThanOrEqual(2);
      expect(c.features.length).toBeGreaterThanOrEqual(2);
      for (const step of c.howItWorks) {
        expect(step.step.trim().length).toBeGreaterThan(3);
        expect(step.detail.trim().length).toBeGreaterThan(10);
      }
    }
  });

  it("demo paths reference real pages if present", () => {
    for (const c of useCases) {
      if (c.demo) {
        expect(c.demo.path).toMatch(/^[a-z0-9-]+$/);
        expect(c.demo.label.trim().length).toBeGreaterThan(3);
      }
    }
  });
});

describe("getUseCase", () => {
  it("returns the matching use case by slug", () => {
    const c = getUseCase("freelancers-consultants");
    expect(c?.audience).toBe("Freelancers & consultants");
  });

  it("returns undefined for unknown slugs", () => {
    expect(getUseCase("no-such-case")).toBeUndefined();
  });
});
