import { test, expect, APIRequestContext } from "@playwright/test";
import { cleanup } from "./helpers/db";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

let api: APIRequestContext;

test.beforeAll(async ({ playwright }) => {
  api = await playwright.request.newContext({ baseURL });
});

test.afterAll(async () => {
  await api.dispose();
  await cleanup("e2e-");
});

async function signIn(page: import("@playwright/test").Page, email: string) {
  const res = await api.post("/api/auth/magic-link", { data: { email } });
  expect(res.status()).toBe(200);
  const { devUrl } = (await res.json()) as { devUrl: string };
  await page.goto(devUrl);
  await page.waitForURL("**/onboarding");
}

test("two users claiming the same name get distinct slugs", async ({ page }) => {
  const emailA = `e2e-claim-a-${Date.now()}@example.com`;
  const emailB = `e2e-claim-b-${Date.now()}@example.com`;

  // User A claims the clean base slug.
  await signIn(page, emailA);
  await page.fill('[data-testid="claim-name"]', "Alex Morgan");
  await expect(page.getByTestId("availability")).toBeVisible();
  await expect(page.getByTestId("availability")).toContainText("/alex-morgan");
  await page.getByTestId("claim-submit").click();
  await expect(page.getByTestId("claim-success")).toBeVisible();
  await expect(page.getByTestId("claim-success")).toContainText("/alex-morgan");

  // User B enters the same name → base is taken → curated variant picker.
  await signIn(page, emailB);
  await page.fill('[data-testid="claim-name"]', "Alex Morgan");
  await expect(page.getByTestId("variant-picker")).toBeVisible();
  await expect(page.getByTestId("variant-picker")).toContainText("is taken");

  // Pick the first available curated keyword and claim.
  await expect(page.getByTestId("keyword-option").first()).toBeVisible();
  await page.getByTestId("keyword-option").first().check();
  await page.getByTestId("claim-submit").click();

  await expect(page.getByTestId("claim-success")).toBeVisible();
  const successText = await page.getByTestId("claim-success").textContent();
  expect(successText).toMatch(/\/alex-morgan-/); // a professional variant, not the base
  expect(successText).not.toContain("alex-morgan</span>"); // distinct from user A's slug
});

test("one-word names show the premium paywall for free users", async ({ page }) => {
  const email = `e2e-claim-oneword-${Date.now()}@example.com`;
  await signIn(page, email);

  await page.fill('[data-testid="claim-name"]', "Beyoncé");
  await expect(page.getByTestId("one-word-paywall")).toBeVisible();
  await expect(page.getByTestId("one-word-paywall")).toContainText("/beyonce");
  await expect(page.getByTestId("one-word-paywall")).toContainText("premium");

  // No claim button behind the paywall.
  await expect(page.getByTestId("claim-submit")).toHaveCount(0);
});

test("claim API requires authentication", async () => {
  const res = await api.post("/api/claims", {
    data: { name: "Jane Doe" },
  });
  expect(res.status()).toBe(401);
});

test("availability API reflects a live claim", async ({ page }) => {
  const email = `e2e-claim-avail-${Date.now()}@example.com`;
  await signIn(page, email);

  await page.fill('[data-testid="claim-name"]', "Casey Quinn");
  await expect(page.getByTestId("availability")).toBeVisible();
  await page.getByTestId("claim-submit").click();
  await expect(page.getByTestId("claim-success")).toBeVisible();

  // Public endpoint now reports the base slug as taken.
  const res = await api.get("/api/claims/availability?name=Casey+Quinn");
  expect(res.status()).toBe(200);
  const body = (await res.json()) as { slug: string; baseAvailable: boolean; variants: unknown[] };
  expect(body.slug).toBe("casey-quinn");
  expect(body.baseAvailable).toBe(false);
  expect(Array.isArray(body.variants)).toBe(true);
});
