import { test, expect, APIRequestContext } from "@playwright/test";
import { cleanup, setUserPremium } from "./helpers/db";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

let api: APIRequestContext;

test.beforeAll(async ({ playwright }) => {
  api = await playwright.request.newContext({ baseURL });
});

test.afterAll(async () => {
  await api.dispose();
  await cleanup("e2e-premium");
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

// Upgrade the user to PREMIUM in the DB, then sign in again so the session JWT
// (which carries the plan) is re-issued with the premium entitlement.
async function signInAsPremium(page: import("@playwright/test").Page, email: string) {
  await signIn(page, email);
  await setUserPremium(email);
  await signIn(page, email);
}

test("premium users can claim one-word names (no paywall)", async ({ page }) => {
  const email = `e2e-premium-oneword-${Date.now()}@example.com`;
  await signInAsPremium(page, email);

  await page.fill('[data-testid="claim-name"]', "Adele");
  // No premium paywall for premium users.
  await expect(page.getByTestId("one-word-paywall")).toHaveCount(0);
  // Direct claim of the one-word slug.
  await expect(page.getByTestId("availability")).toBeVisible();
  await expect(page.getByTestId("availability")).toContainText("/adele");
  await page.getByTestId("claim-submit").click();
  await expect(page.getByTestId("claim-success")).toBeVisible();
  await expect(page.getByTestId("claim-success")).toContainText("/adele");
});

test("premium users can claim a custom handle when the base slug is taken", async ({ page }) => {
  // User A (free) takes the clean base slug.
  const emailA = `e2e-premium-a-${Date.now()}@example.com`;
  await signIn(page, emailA);
  await page.fill('[data-testid="claim-name"]', "Riley Adams");
  await expect(page.getByTestId("availability")).toBeVisible();
  await page.getByTestId("claim-submit").click();
  await expect(page.getByTestId("claim-success")).toBeVisible();

  // Premium user B sees the variant picker AND the custom-handle option.
  const emailB = `e2e-premium-b-${Date.now()}@example.com`;
  await signInAsPremium(page, emailB);

  await page.fill('[data-testid="claim-name"]', "Riley Adams");
  await expect(page.getByTestId("variant-picker")).toBeVisible();

  await page.fill('[data-testid="custom-slug"]', "rileyadamspro");
  await page.getByTestId("claim-submit").click();
  await expect(page.getByTestId("claim-success")).toBeVisible();
  await expect(page.getByTestId("claim-success")).toContainText("/rileyadamspro");
});

test("name monitoring: free sees upsell, premium can manage rules in settings", async ({
  page,
}) => {
  // Free user → settings shows the premium upsell, not the manager.
  const emailFree = `e2e-premium-free-${Date.now()}@example.com`;
  await signIn(page, emailFree);
  await page.goto("/settings");
  await expect(page.getByTestId("monitoring-upsell")).toBeVisible();
  await expect(page.getByTestId("monitoring-manager")).toHaveCount(0);

  // Premium user → can add and remove a monitoring rule.
  const emailPremium = `e2e-premium-mon-${Date.now()}@example.com`;
  await signInAsPremium(page, emailPremium);
  await page.goto("/settings");
  await expect(page.getByTestId("monitoring-manager")).toBeVisible();
  await expect(page.getByTestId("monitoring-upsell")).toHaveCount(0);

  await page.fill('[data-testid="monitoring-name"]', "Jane Doe");
  await page.getByTestId("monitoring-add").click();
  await expect(page.getByTestId("monitoring-list")).toContainText("jane doe");

  await page.getByTestId("monitoring-rule").getByRole("button", { name: "Remove" }).click();
  await expect(page.getByTestId("monitoring-list")).toHaveCount(1);
  await expect(page.getByTestId("monitoring-list")).not.toContainText("jane doe");
});
