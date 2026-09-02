import { test, expect } from "@playwright/test";

test("landing page renders all sections and CTAs route to onboarding", async ({ page }) => {
  await page.goto("/");

  // Hero
  await expect(page).toHaveTitle(/Your name, ranked for you/i);
  await expect(page.getByRole("heading", { name: /Your name, ranked for you/i })).toBeVisible();

  // Scarcity strip
  await expect(page.getByText(/names still available today/i)).toBeVisible();
  await expect(page.getByText(/beyonce/i)).toBeVisible();
  await expect(page.locator("span", { hasText: /^Premium$/ })).toBeVisible();

  // How it works
  await expect(page.getByRole("heading", { name: /How it works/i })).toBeVisible();

  // Demo profiles
  await expect(page.getByText(/Alex Rivera/i)).toBeVisible();
  await expect(page.getByText(/Jordan Lee/i)).toBeVisible();

  // Pricing
  await expect(page.getByRole("heading", { name: /Simple pricing/i })).toBeVisible();
  await expect(page.getByText("$9/mo")).toBeVisible();
  await expect(page.getByText(/Launch offer/)).toBeVisible();

  // CTAs route to onboarding
  const claimLinks = page.getByRole("link", { name: /Claim your name/i });
  const count = await claimLinks.count();
  expect(count).toBeGreaterThanOrEqual(2);
  const href = await claimLinks.first().getAttribute("href");
  expect(href).toBe("/onboarding");
});

test("landing page emits Organization JSON-LD", async ({ page }) => {
  await page.goto("/");
  const jsonLd = await page.locator('script[type="application/ld+json"]').first().textContent();
  expect(jsonLd).toContain('"@type":"Organization"');
  expect(jsonLd).toContain('"name":"NamesRanker"');
});
