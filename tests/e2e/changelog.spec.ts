import { test, expect } from "@playwright/test";

test("changelog renders entries with tags and related post links", async ({ page }) => {
  await page.goto("/changelog");
  await expect(page.getByRole("heading", { level: 1, name: "Changelog" })).toBeVisible();
  const entries = page.getByTestId("changelog-entry");
  expect(await entries.count()).toBeGreaterThan(5);

  // Newest entry first, with a Feature tag.
  await expect(entries.first()).toContainText("v1.4");
  await expect(entries.first()).toContainText("Feature");

  // Tags render across entries.
  await expect(page.getByText("Security").first()).toBeVisible();
  await expect(page.getByText("Fix").first()).toBeVisible();

  // A related announcement link navigates to the blog post.
  await page
    .getByRole("link", { name: /Read the announcement/ })
    .first()
    .click();
  await page.waitForURL("**/blog/**");
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
});

test("changelog entries are unique and ordered newest first", async ({ page }) => {
  await page.goto("/changelog");
  const versions = await page.getByTestId("changelog-version").allTextContents();
  const cleaned = versions.map((v) => v.trim());
  expect(new Set(cleaned).size).toBe(cleaned.length);
  expect(cleaned[0]).toBe("v1.4");
});
