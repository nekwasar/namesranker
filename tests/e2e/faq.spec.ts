import { test, expect } from "@playwright/test";

test("faq page renders with title, tabs, and working accordion", async ({ page }) => {
  await page.goto("/faq");
  await expect(page).toHaveTitle(/FAQ/);
  await expect(page.getByRole("heading", { level: 1, name: "FAQ" })).toBeVisible();

  // Category tabs present.
  await expect(page.getByTestId("faq-tab-all")).toBeVisible();
  await expect(page.getByTestId("faq-tab-premium-pricing")).toBeVisible();

  // Accordion items render.
  const items = page.getByTestId("faq-item");
  expect(await items.count()).toBeGreaterThan(10);

  // Clicking a question opens its answer.
  await page
    .getByTestId("faq-question")
    .filter({ hasText: /guaranteed to rank/ })
    .click();
  await expect(
    items.filter({ hasText: /guaranteed to rank/ }).getByText(/SEO-engineered page/)
  ).toBeVisible();
});

test("faq search filters questions", async ({ page }) => {
  await page.goto("/faq");
  const before = await page.getByTestId("faq-item").count();
  await page.getByTestId("faq-search").fill("custom domain");
  const items = page.getByTestId("faq-item");
  expect(await items.count()).toBeLessThan(before);
  expect(await items.count()).toBeGreaterThan(0);
  // Every visible item mentions custom domain in its question or answer.
  for (let i = 0; i < (await items.count()); i++) {
    await expect(items.nth(i)).toContainText(/custom domain/i);
  }
});

test("faq category tab filters by category", async ({ page }) => {
  await page.goto("/faq");
  await page.getByTestId("faq-tab-premium-pricing").click();
  const items = page.getByTestId("faq-item");
  expect(await items.count()).toBeGreaterThan(0);
  await expect(items.first()).toContainText(/cost|premium|cancel|payment/i);
});

test("faq empty state appears for an unmatched search", async ({ page }) => {
  await page.goto("/faq");
  await page.getByTestId("faq-search").fill("zzzz-no-such-term-zzzz");
  await expect(page.getByTestId("faq-empty")).toBeVisible();
});

test("nav mega menu FAQ link goes to /faq", async ({ page }) => {
  await page.goto("/");
  await page.hover("text=Resources");
  await page.getByRole("link", { name: /FAQ/ }).first().click();
  await page.waitForURL("**/faq");
  await expect(page.getByRole("heading", { level: 1, name: "FAQ" })).toBeVisible();
});
