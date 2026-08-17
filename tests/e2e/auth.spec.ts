import { test, expect, APIRequestContext } from "@playwright/test";
import { seedExpiredToken, cleanup } from "./helpers/db";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

let api: APIRequestContext;

test.beforeAll(async ({ playwright }) => {
  api = await playwright.request.newContext({ baseURL });
});

test.afterAll(async () => {
  await api.dispose();
  await cleanup("e2e-");
});

async function requestMagicLink(email: string) {
  const res = await api.post("/api/auth/magic-link", { data: { email } });
  expect(res.status()).toBe(200);
  return (await res.json()) as { ok: boolean; devUrl: string };
}

test("new user signs in and lands on /onboarding", async ({ page }) => {
  const email = `e2e-new-${Date.now()}@example.com`;
  const { devUrl } = await requestMagicLink(email);

  await page.goto(devUrl);
  await page.waitForURL("**/onboarding");
  await expect(page.getByRole("heading", { name: "Claim your name" })).toBeVisible();

  // Session cookie is set.
  const cookies = await page.context().cookies();
  expect(cookies.some((c) => c.name === "namesranker.session")).toBe(true);
});

test("magic link token is single-use (replay rejected)", async ({ page }) => {
  const email = `e2e-once-${Date.now()}@example.com`;
  const { devUrl } = await requestMagicLink(email);

  await page.goto(devUrl);
  await page.waitForURL("**/onboarding");

  // Reusing the same token must fail with error=used.
  await page.goto(devUrl);
  await page.waitForURL("**/login?error=used");
  await expect(page.getByText(/already been used/i)).toBeVisible();
});

test("invalid token is rejected", async ({ page }) => {
  await page.goto("/api/auth/verify?token=definitely-not-a-real-token");
  await page.waitForURL("**/login?error=invalid");
  await expect(page.getByText(/link is invalid/i)).toBeVisible();
});

test("expired token is rejected", async ({ page }) => {
  const email = `e2e-expired-${Date.now()}@example.com`;
  const rawToken = "expired-test-token";

  // Seed an already-expired token directly in the DB (bypasses API on purpose).
  await seedExpiredToken(email, rawToken);

  await page.goto(`/api/auth/verify?token=${rawToken}`);
  await page.waitForURL("**/login?error=expired");
  await expect(page.getByText(/has expired/i)).toBeVisible();
});

test("missing token is rejected", async ({ page }) => {
  await page.goto("/api/auth/verify");
  await page.waitForURL("**/login?error=invalid");
});

test("magic link request validates email format", async () => {
  const res = await api.post("/api/auth/magic-link", {
    data: { email: "not-an-email" },
  });
  expect(res.status()).toBe(400);
});

test("protected /settings requires auth (redirects to /login)", async ({ page }) => {
  await page.goto("/settings");
  await page.waitForURL("**/login?callbackUrl=*");
  await expect(page.getByRole("heading", { name: "Sign in to NamesRanker" })).toBeVisible();
});

test("authenticated user can access /settings", async ({ page }) => {
  const email = `e2e-settings-${Date.now()}@example.com`;
  const { devUrl } = await requestMagicLink(email);

  await page.goto(devUrl);
  await page.waitForURL("**/onboarding");

  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
});
