import { describe, expect, it } from "vitest";
import { annualGracePeriodDays, magicLinkTokenTtlMs } from "@/lib/config";

describe("config constants", () => {
  it("magic link tokens expire after 15 minutes", () => {
    expect(magicLinkTokenTtlMs).toBe(15 * 60 * 1000);
  });

  it("annual lapse grants a 30-day grace period", () => {
    expect(annualGracePeriodDays).toBe(30);
  });
});
