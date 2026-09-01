import { test, expect } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

test("blog landing renders the card grid with posts", async ({ page }) => {
  await page.goto("/blog");
  await expect(page.getByRole("heading", { name: "Blog" })).toBeVisible();
  const cards = page.getByTestId("blog-grid").locator("a");
  expect(await cards.count()).toBeGreaterThanOrEqual(9);
  await expect(cards.first()).toBeVisible();
});

test("featured post renders as a hero and links to its article", async ({ page }) => {
  await page.goto("/blog");
  const hero = page.getByTestId("blog-featured");
  await expect(hero).toBeVisible();
  await expect(hero).toContainText("Featured");
  await expect(hero).toContainText(/search query/i);
  await hero.click();
  await page.waitForURL("**/blog/your-name-is-a-search-query");
  await expect(page.getByRole("heading", { name: /Your name is a search query/ })).toBeVisible();
});

test("featured article renders headings, list, and no preview sign-off", async ({ page }) => {
  await page.goto("/blog/your-name-is-a-search-query");
  await expect(page.getByRole("heading", { name: /Your name is a search query/ })).toBeVisible();
  // Full article has sub-headings and a checklist.
  await expect(page.getByRole("heading", { name: /highest-intent keyword/ })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /Metadata is where rankings are won/ })
  ).toBeVisible();
  await expect(page.locator("ul").first()).toBeVisible();
  // The preview sign-off must not appear on a full post.
  await expect(page.getByText(/this is a preview/)).toHaveCount(0);
});

test("category tabs filter the grid", async ({ page }) => {
  await page.goto("/blog");
  await page.getByTestId("blog-tab-engineering").click();
  const cards = page.getByTestId("blog-grid").locator("a");
  await expect(cards.first()).toBeVisible();
  const count = await cards.count();
  expect(count).toBeGreaterThan(0);
  expect(count).toBeLessThan(9); // narrowed from the full list
  // Every visible card carries the category tag.
  for (let i = 0; i < Math.min(count, 3); i++) {
    await expect(cards.nth(i)).toContainText("Engineering");
  }
});

test("search narrows posts by title and author", async ({ page }) => {
  await page.goto("/blog");
  await page.getByTestId("blog-search").fill("search console");
  const cards = page.getByTestId("blog-grid").locator("a");
  await expect(cards).toHaveCount(1);
  await expect(cards.first()).toContainText("Search Console, now per page");
});

test("unknown search shows the empty state", async ({ page }) => {
  await page.goto("/blog");
  await page.getByTestId("blog-search").fill("zzz-no-such-term");
  await expect(page.getByTestId("blog-empty")).toBeVisible();
});

test("RSS feed is served", async ({ page }) => {
  const res = await page.request.get("/blog/feed.xml");
  expect(res.status()).toBe(200);
  const body = await res.text();
  expect(body).toContain('<rss version="2.0">');
  expect(body).toContain("/blog/search-console-per-page");
});

test("a post page renders from a card link", async ({ page }) => {
  await page.goto("/blog");
  await page.getByRole("link", { name: /Search Console, now per page/ }).click();
  await page.waitForURL("**/blog/search-console-per-page");
  await expect(page.getByRole("heading", { name: "Search Console, now per page" })).toBeVisible();
  await expect(page.getByText("v0")).toBeVisible();
  // Unknown slugs 404.
  const missing = await page.request.get("/blog/does-not-exist");
  expect(missing.status()).toBe(404);
});
