import { test, expect, APIRequestContext } from "@playwright/test";
import { cleanup, setUserPremium } from "./helpers/db";

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

async function signInAsPremium(page: import("@playwright/test").Page, email: string) {
  await signIn(page, email);
  await setUserPremium(email);
  await signIn(page, email);
}

// Claim a name and publish the hub page quickly (skipping content steps).
async function claimAndPublish(page: import("@playwright/test").Page, name: string) {
  await page.fill('[data-testid="claim-name"]', name);
  await expect(page.getByTestId("availability")).toBeVisible();
  await page.getByTestId("claim-submit").click();
  await expect(page.getByTestId("claim-success")).toBeVisible();
  await page.getByTestId("claim-continue").click();
  await page.waitForURL("**/onboarding?step=2");
  await expect(page.getByTestId("step-2")).toBeVisible();

  for (let step = 3; step <= 7; step++) {
    await page.getByTestId("wizard-skip").click();
    await page.waitForURL(`**/onboarding?step=${step}`);
  }
  await expect(page.getByTestId("step-7")).toBeVisible();
  await page.getByTestId("publish-button").click();
  await expect(page.getByTestId("publish-success")).toBeVisible();
}

test("content edits round-trip to the public page", async ({ page }) => {
  const email = `e2e-set-content-${Date.now()}@example.com`;
  await signIn(page, email);
  await claimAndPublish(page, "Maya Patel");

  // Edit the profile section.
  await page.goto("/settings/user-data");
  await expect(page.getByTestId("settings-descriptor")).toBeVisible();
  await page.fill('[data-testid="settings-descriptor"]', "Product Designer · Chicago");
  await page.fill('[data-testid="settings-bio"]', "Designs design systems and trains teams.");
  await page.getByTestId("save-profile").click();
  await expect(page.getByTestId("save-flash")).toContainText("SEO score");

  // The public page reflects the saved content.
  await page.goto("/maya-patel");
  await expect(page.getByRole("heading", { name: "Maya Patel" })).toBeVisible();
  await expect(page.getByText(/Product Designer · Chicago/)).toBeVisible();
  await expect(page.getByText(/Designs design systems and trains teams/)).toBeVisible();
});

test("SEO editor saves meta tags that render on the public page", async ({ page }) => {
  const email = `e2e-set-seo-${Date.now()}@example.com`;
  await signIn(page, email);
  await claimAndPublish(page, "Noah Kim");

  await page.goto("/settings/user-data");
  await expect(page.getByTestId("meta-title")).toBeVisible();

  await page.fill('[data-testid="meta-title"]', "Noah Kim — Data Engineer in Seattle");
  await page.fill(
    '[data-testid="meta-description"]',
    "Noah Kim is a data engineer in Seattle who builds pipelines and dashboards for climate startups."
  );
  await expect(page.getByTestId("seo-score")).toContainText("/100");
  await page.getByTestId("save-seo").click();
  await expect(page.getByTestId("save-flash")).toContainText("SEO saved");

  // The public page renders the custom title and description.
  await page.goto("/noah-kim");
  await expect(page).toHaveTitle("Noah Kim — Data Engineer in Seattle");
  const metaDesc = await page.locator('meta[name="description"]').getAttribute("content");
  expect(metaDesc).toContain("climate startups");
});

test("sub-pages: free sees upsell, premium can create and render one", async ({ page }) => {
  // Free user — sub-pages are gated.
  const emailFree = `e2e-set-subfree-${Date.now()}@example.com`;
  await signIn(page, emailFree);
  await claimAndPublish(page, "Zoe Park");
  await page.goto("/settings/user-data");
  await expect(page.getByTestId("subpage-upsell")).toBeVisible();
  await expect(page.getByTestId("subpage-create")).toHaveCount(0);

  // Premium user — can create a sub-page under the claimed slug.
  const emailPremium = `e2e-set-subprem-${Date.now()}@example.com`;
  await signInAsPremium(page, emailPremium);
  await claimAndPublish(page, "Omar Haddad");
  await page.goto("/settings/user-data");
  await expect(page.getByTestId("subpage-create")).toBeVisible();

  await page.fill('[data-testid="subpage-title"]', "Portfolio");
  await page.fill('[data-testid="subpage-segment"]', "portfolio");
  await page.getByTestId("subpage-create").click();
  await expect(page.getByTestId("subpage-row")).toContainText("/omar-haddad/portfolio");
  await expect(page.getByTestId("save-flash")).toContainText("Sub-page created");

  // The sub-page renders publicly with a link back to the hub.
  await page.goto("/omar-haddad/portfolio");
  await expect(page.getByRole("heading", { name: "Portfolio" })).toBeVisible();
  await expect(page.getByText("← Omar Haddad")).toBeVisible();
});

test("GDPR export returns the account and delete removes it", async ({ page }) => {
  const email = `e2e-set-gdpr-${Date.now()}@example.com`;
  await signIn(page, email);
  await claimAndPublish(page, "Lena Vogel");

  await page.goto("/settings/user-data");
  await expect(page.getByTestId("export-data")).toBeVisible();

  // Export — fetch in the authenticated browser context.
  const exported = await page.evaluate(async () => {
    const res = await fetch("/api/settings/export");
    return { status: res.status, body: (await res.json()) as { user?: { email?: string } } };
  });
  expect(exported.status).toBe(200);
  expect(exported.body.user?.email).toBe(email);

  // Delete the account — confirm flow then land back home.
  await page.getByTestId("delete-account").click();
  await expect(page.getByTestId("delete-confirm")).toBeVisible();
  await page.getByTestId("delete-confirm-yes").click();
  await page.waitForURL(`${baseURL}/`);

  // The session is cleared — /settings now redirects to /login.
  await page.goto("/settings");
  await page.waitForURL("**/login**");
});
