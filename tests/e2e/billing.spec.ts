import { test, expect, APIRequestContext } from "@playwright/test";
import { cleanup, getDb } from "./helpers/db";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

let api: APIRequestContext;

test.beforeAll(async ({ playwright }) => {
  api = await playwright.request.newContext({ baseURL });
});

test.afterAll(async () => {
  await api.dispose();
  await cleanup("e2e-bill");
});

async function signIn(page: import("@playwright/test").Page, email: string) {
  // Magic links only go to existing accounts — create one first.
  const signup = await api.post("/api/auth/signup", {
    data: { firstName: "Ada", lastName: "Lovelace", email, password: "Sup3r-secret!" },
  });
  expect(signup.status()).toBe(200);
  const res = await api.post("/api/auth/magic-link", { data: { email } });
  expect(res.status()).toBe(200);
  const { devUrl } = (await res.json()) as { devUrl: string };
  await page.goto(devUrl);
  await page.waitForURL("**/onboarding");
}

async function getUserId(db: import("pg").Client, email: string): Promise<string> {
  const res = await db.query(`SELECT "id" FROM "User" WHERE "email" = $1`, [email]);
  return res.rows[0].id;
}

async function simulate(db: import("pg").Client, userId: string, event: string, cycle?: string) {
  const body: Record<string, string> = { userId, event };
  if (cycle) body.cycle = cycle;
  return api.post("/api/billing/simulate", { data: body });
}

test("checkout entitles the user premium: one-word claim becomes available + settings show Premium", async ({
  page,
}) => {
  const email = `e2e-bill-flow-${Date.now()}@example.com`;
  await signIn(page, email);
  const db = await getDb();
  const userId = await getUserId(db, email);

  // Before upgrade: one-word is paywalled.
  await page.fill('[data-testid="claim-name"]', "Beyoncé");
  await expect(page.getByTestId("one-word-paywall")).toBeVisible();

  // "Purchase" via dev simulator (mirrors Stripe checkout.session.completed).
  const res = await simulate(db, userId, "checkout.completed", "monthly");
  expect(res.status()).toBe(200);
  expect((await res.json()).plan).toBe("PREMIUM");

  // Re-sign to re-issue the session with the new plan.
  await signIn(page, email);
  await page.goto("/settings");
  await expect(page.getByTestId("manage-billing")).toBeVisible();
  await expect(page.getByText(/You're on Premium/)).toBeVisible();

  // One-word is now claimable.
  await page.goto("/onboarding");
  await page.fill('[data-testid="claim-name"]', "Beyoncé");
  await expect(page.getByTestId("one-word-paywall")).toHaveCount(0);
  await expect(page.getByTestId("availability")).toBeVisible();
  await page.getByTestId("claim-submit").click();
  await expect(page.getByTestId("claim-success")).toBeVisible();
});

test("monthly cancellation releases the one-word slug immediately", async ({ page }) => {
  const email = `e2e-bill-lapse-${Date.now()}@example.com`;
  await signIn(page, email);
  const db = await getDb();
  const userId = await getUserId(db, email);

  // Become premium + claim a unique one-word slug (avoid collisions on re-run).
  const oneWord = `Maddox${Date.now()}`;
  await simulate(db, userId, "checkout.completed", "monthly");
  await signIn(page, email);
  await page.goto("/onboarding");
  await page.fill('[data-testid="claim-name"]', oneWord);
  await expect(page.getByTestId("availability")).toBeVisible();
  await page.getByTestId("claim-submit").click();
  await expect(page.getByTestId("claim-success")).toBeVisible();
  await expect(page.getByTestId("claim-success")).toContainText(oneWord.toLowerCase());

  // Cancel (monthly lapse) → the one-word slug is released to the pool.
  const cancelRes = await simulate(db, userId, "subscription.cancelled", "monthly");
  expect(cancelRes.status()).toBe(200);
  const released = (await cancelRes.json()).released;
  expect(released).toBe(1);

  // The claim row is now RELEASED.
  const claims = await db.query(`SELECT "status" FROM "NameClaim" WHERE "claimedById" = $1`, [
    userId,
  ]);
  expect(claims.rows[0].status).toBe("RELEASED");
});

test("annual cancellation enters a 30-day grace on the one-word slug", async ({ page }) => {
  const email = `e2e-bill-grace-${Date.now()}@example.com`;
  await signIn(page, email);
  const db = await getDb();
  const userId = await getUserId(db, email);

  await simulate(db, userId, "checkout.completed", "annual");
  await signIn(page, email);
  await page.goto("/onboarding");
  const oneWord = `Echo${Date.now()}`;
  await page.fill('[data-testid="claim-name"]', oneWord);
  await expect(page.getByTestId("availability")).toBeVisible();
  await page.getByTestId("claim-submit").click();
  await expect(page.getByTestId("claim-success")).toBeVisible();

  const cancelRes = await simulate(db, userId, "subscription.cancelled", "annual");
  expect((await cancelRes.json()).grace).toBe(true);

  const claims = await db.query(
    `SELECT "status", "graceUntil" FROM "NameClaim" WHERE "claimedById" = $1`,
    [userId]
  );
  expect(claims.rows[0].status).toBe("PENDING_RELEASE");
  expect(new Date(claims.rows[0].graceUntil)).toBeInstanceOf(Date);
});
