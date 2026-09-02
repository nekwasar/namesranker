import { test, expect, APIRequestContext } from "@playwright/test";
import { cleanup, getDb } from "./helpers/db";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

let api: APIRequestContext;

test.beforeAll(async ({ playwright }) => {
  api = await playwright.request.newContext({ baseURL });
});

test.afterAll(async () => {
  await api.dispose();
  await cleanup("e2e-gsc");
});

async function signIn(page: import("@playwright/test").Page, email: string, next = "/onboarding") {
  // Magic links only go to existing accounts — create one first.
  const signup = await api.post("/api/auth/signup", {
    data: { firstName: "Ada", lastName: "Lovelace", email, password: "Sup3r-secret!" },
  });
  expect(signup.status()).toBe(200);
  const res = await api.post("/api/auth/magic-link", { data: { email } });
  expect(res.status()).toBe(200);
  const { devUrl } = (await res.json()) as { devUrl: string };
  const url = new URL(devUrl);
  url.searchParams.set("next", next);
  await page.goto(url.toString());
  await page.waitForURL(`**${next}**`);
}

// Claim a name and publish the hub page quickly (so there's an owned page).
async function claimAndPublish(page: import("@playwright/test").Page, name: string) {
  await page.fill('[data-testid="claim-name"]', name);
  await expect(page.getByTestId("availability")).toBeVisible();
  await page.getByTestId("claim-submit").click();
  await expect(page.getByTestId("claim-success")).toBeVisible();
  await page.getByTestId("claim-continue").click();
  await page.waitForURL("**/onboarding?step=2");
  for (let step = 3; step <= 7; step++) {
    await page.getByTestId("wizard-skip").click();
    await page.waitForURL(`**/onboarding?step=${step}`);
  }
  await expect(page.getByTestId("step-7")).toBeVisible();
  await page.getByTestId("publish-button").click();
  await expect(page.getByTestId("publish-success")).toBeVisible();
}

async function setPremium(email: string) {
  const db = await getDb();
  await db.query(`UPDATE "User" SET "plan" = 'PREMIUM' WHERE "email" = $1`, [email]);
}

async function getUserId(db: import("pg").Client, email: string): Promise<string> {
  const res = await db.query(`SELECT "id" FROM "User" WHERE "email" = $1`, [email]);
  return res.rows[0].id;
}

async function getPageId(db: import("pg").Client, userId: string, path: string): Promise<string> {
  const res = await db.query(`SELECT "id" FROM "Page" WHERE "ownerId" = $1 AND "path" = $2`, [
    userId,
    path,
  ]);
  return res.rows[0].id;
}

test("free users see the premium upsell, premium can connect, refresh, and disconnect Search Console", async ({
  page,
}) => {
  const email = `e2e-gsc-owner-${Date.now()}@example.com`;
  await signIn(page, email);
  await claimAndPublish(page, "Theo Hart");

  // Free user → upsell in settings, no manager.
  await page.goto("/settings");
  await expect(page.getByTestId("gsc-upsell")).toBeVisible();
  await expect(page.getByTestId("gsc-manager")).toHaveCount(0);

  // Upgrade to premium and revisit settings.
  await setPremium(email);
  await signIn(page, email, "/settings");
  await expect(page.getByTestId("gsc-manager")).toBeVisible();
  await expect(page.getByTestId("gsc-upsell")).toHaveCount(0);

  // Pick the owned hub page and simulate a successful OAuth connect.
  const db = await getDb();
  const userId = await getUserId(db, email);
  const path = "theo-hart";
  const pageId = await getPageId(db, userId, path);
  await page.selectOption('[data-testid="gsc-page-select"]', { value: pageId });
  // Use the authenticated browser context (page.request shares the session cookie).
  const res = await page.request.post("/api/settings/gsc/simulate", { data: { pageId } });
  expect(res.status()).toBe(200);
  await page.reload();

  // The link shows up; refresh reveals fabricated analytics.
  await expect(page.getByTestId(`gsc-refresh-${path}`)).toBeVisible();
  await page.getByTestId(`gsc-refresh-${path}`).click();
  await expect(page.getByTestId("gsc-panel")).toBeVisible();
  await expect(page.getByTestId("gsc-panel")).toContainText("Impressions");
  await expect(page.getByTestId("gsc-panel")).toContainText("alex morgan");

  // Disconnect removes the link.
  await page.getByTestId("gsc-link").getByRole("button", { name: "Disconnect" }).click();
  await expect(page.getByTestId("gsc-list")).not.toContainText(`/${path}`);
});
