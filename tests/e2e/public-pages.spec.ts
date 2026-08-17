import { test, expect } from "@playwright/test";
import { getDb, cleanup } from "./helpers/db";

test.beforeAll(async () => {
  const db = await getDb();
  // Ensure demo pages exist for the assertions below (idempotent).
  const count = await db.query(`SELECT count(*)::int AS n FROM "Page" WHERE "status" = 'LIVE'`);
  if (count.rows[0].n < 2) {
    throw new Error("Demo profiles not seeded. Run: npm run db:seed:demo");
  }
});

test.afterAll(async () => {
  await cleanup("e2e-");
});

test("hub page renders with SEO metadata and JSON-LD Person", async ({ page }) => {
  await page.goto("/alex-rivera");

  await expect(page.getByRole("heading", { name: /Alex Rivera/i })).toBeVisible();
  await expect(page.getByText(/Product Designer/i).first()).toBeVisible();
  await expect(page.getByText(/Design Systems That Scale/i)).toBeVisible();
  await expect(page.getByText(/Habit Nest/i)).toBeVisible();

  // SEO metadata
  await expect(page).toHaveTitle(/Alex Rivera — Product Designer in Austin/i);
  const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
  expect(canonical).toBe("https://namesranker.com/alex-rivera");

  // JSON-LD Person/ProfilePage
  const jsonLd = await page.locator('script[type="application/ld+json"]').first().textContent();
  const parsed = JSON.parse(jsonLd!);
  expect(parsed["@type"]).toBe("ProfilePage");
  expect(parsed.mainEntity["@type"]).toBe("Person");
  expect(parsed.mainEntity.name).toContain("Alex Rivera");
  expect(parsed.mainEntity.sameAs.length).toBeGreaterThan(0);
});

test("keyword-variant hub page renders (jordan-lee-codes)", async ({ page }) => {
  await page.goto("/jordan-lee-codes");

  await expect(page.getByRole("heading", { name: /Jordan Lee/i })).toBeVisible();
  await expect(page.getByText(/Software Engineer/i).first()).toBeVisible();
  await expect(page.getByText(/Ledgerify/i)).toBeVisible();
});

test("unknown page returns 404", async ({ page }) => {
  const res = await page.goto("/this-person-does-not-exist");
  expect(res?.status()).toBe(404);
});

test("sitemap lists demo pages", async ({ request }) => {
  const res = await request.get("/sitemap.xml");
  expect(res.status()).toBe(200);
  const body = await res.text();
  expect(body).toContain("<loc>https://namesranker.com/alex-rivera</loc>");
  expect(body).toContain("<loc>https://namesranker.com/jordan-lee-codes</loc>");
});

test("robots.txt disallows private paths", async ({ request }) => {
  const res = await request.get("/robots.txt");
  expect(res.status()).toBe(200);
  const body = await res.text();
  expect(body).toContain("Disallow: /settings");
  expect(body).toContain("Sitemap: https://namesranker.com/sitemap.xml");
});

test("revalidate endpoint requires auth", async ({ request }) => {
  const noAuth = await request.post("/api/revalidate", {
    data: { paths: ["alex-rivera"] },
  });
  expect(noAuth.status()).toBe(401);
});
