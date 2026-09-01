import { test, expect } from "@playwright/test";

test("use-cases index renders cards and links to detail pages", async ({ page }) => {
  await page.goto("/usecases");
  await expect(page).toHaveTitle(/Use cases/);
  await expect(page.getByRole("heading", { level: 1, name: "Use cases" })).toBeVisible();

  const cards = page.getByTestId("usecase-card");
  const count = await cards.count();
  expect(count).toBeGreaterThanOrEqual(4);

  // Every card links to its detail page.
  for (let i = 0; i < count; i++) {
    await expect(cards.nth(i)).toHaveAttribute("href", /^\/usecases\//);
  }

  // The CTA routes to onboarding.
  await expect(page.getByRole("link", { name: "Claim your name" }).last()).toHaveAttribute(
    "href",
    "/onboarding"
  );
});

test("use-case detail page renders full story and CTA", async ({ page }) => {
  await page.goto("/usecases/freelancers-consultants");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText("The scenario")).toBeVisible();
  await expect(page.getByText("What usually goes wrong")).toBeVisible();
  await expect(page.getByText("How NamesRanker fixes it")).toBeVisible();
  await expect(page.getByText("What you get")).toBeVisible();
  await expect(page.getByRole("link", { name: "Claim your name" }).last()).toHaveAttribute(
    "href",
    "/onboarding"
  );
});

test("use-case detail page links back to the index", async ({ page }) => {
  await page.goto("/usecases/founders-executives");
  await page.getByRole("link", { name: "All use cases" }).click();
  await page.waitForURL("**/usecases");
  await expect(page.getByRole("heading", { level: 1, name: "Use cases" })).toBeVisible();
});

test("unknown use-case slug returns 404", async ({ page }) => {
  const res = await page.goto("/usecases/no-such-case");
  expect(res?.status()).toBe(404);
});

test("nav mega menu use-cases link works", async ({ page }) => {
  await page.goto("/");
  await page.hover("text=Resources");
  await page
    .getByRole("link", { name: /Use cases/ })
    .first()
    .click();
  await page.waitForURL("**/usecases");
  await expect(page.getByRole("heading", { level: 1, name: "Use cases" })).toBeVisible();
});
