import { test, expect } from "@playwright/test";

test("landing page renders and links to onboarding", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/NamesRanker/i);
  await expect(page.getByRole("link", { name: /claim/i }).first()).toBeVisible();
});
