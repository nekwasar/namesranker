import { describe, expect, it } from "vitest";
import { safeRedirectPath, safeRedirectUrl } from "@/lib/auth/redirect";

describe("safeRedirect", () => {
  it("allows local relative paths", () => {
    expect(safeRedirectPath("/onboarding", "/settings")).toBe("/onboarding");
    expect(safeRedirectPath("/settings/user-data", "/settings")).toBe("/settings/user-data");
  });

  it("rejects external URLs and protocol-relative paths", () => {
    expect(safeRedirectPath("https://evil.com", "/settings")).toBe("/settings");
    expect(safeRedirectPath("//evil.com", "/settings")).toBe("/settings");
    expect(safeRedirectPath("javascript:alert(1)", "/settings")).toBe("/settings");
    expect(safeRedirectPath(null, "/settings")).toBe("/settings");
    expect(safeRedirectPath("", "/settings")).toBe("/settings");
  });

  it("builds a safe URL within the origin", () => {
    const url = safeRedirectUrl("/onboarding", "https://namesranker.com", "/settings");
    expect(url.toString()).toBe("https://namesranker.com/onboarding");
  });

  it("falls back for malicious input", () => {
    const url = safeRedirectUrl("https://evil.com", "https://namesranker.com", "/settings");
    expect(url.toString()).toBe("https://namesranker.com/settings");
  });
});
