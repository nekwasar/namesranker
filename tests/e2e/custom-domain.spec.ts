import { test, expect, APIRequestContext } from "@playwright/test";
import { cleanup, getDb } from "./helpers/db";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

let api: APIRequestContext;

test.beforeAll(async ({ playwright }) => {
  api = await playwright.request.newContext({ baseURL });
});

test.afterAll(async () => {
  await api.dispose();
  await cleanup("e2e-cdom");
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

test("premium users can set, serve, and remove a custom domain", async ({ page }) => {
  const email = `e2e-cdom-owner-${Date.now()}@example.com`;
  const domain = `person-${Date.now()}.test`;
  await signIn(page, email);
  await claimAndPublish(page, "Iris Vance");

  // Free → upsell in settings.
  await page.goto("/settings/user-data");
  await expect(page.getByTestId("custom-domain-upsell")).toBeVisible();
  await expect(page.getByTestId("custom-domain-form")).toHaveCount(0);

  // Upgrade to premium, revisit.
  const db = await getDb();
  await db.query(`UPDATE "User" SET "plan" = 'PREMIUM' WHERE "email" = $1`, [email]);
  await signIn(page, email, "/settings/user-data");
  await expect(page.getByTestId("custom-domain-form")).toBeVisible();
  await expect(page.getByTestId("custom-domain-upsell")).toHaveCount(0);

  // Save a domain → token + TXT instructions appear.
  await page.fill('[data-testid="custom-domain-input"]', domain);
  await page.getByTestId("custom-domain-save").click();
  await expect(page.getByTestId("custom-domain-active")).toBeVisible();
  await expect(page.getByTestId("custom-domain-txt")).toBeVisible();
  await expect(page.getByTestId("custom-domain-txt")).toContainText(`_namesranker.${domain}`);

  // Mark verified directly in the DB (DNS lookup can't run in e2e), then serve.
  const pageRow = await db.query(
    `SELECT p."id" FROM "Page" p JOIN "User" u ON u.id = p."ownerId"
     WHERE u.email = $1 AND p."customDomain" = $2`,
    [email, domain]
  );
  expect(pageRow.rows.length).toBe(1);
  await db.query(`UPDATE "Page" SET "customDomainVerifiedAt" = now() WHERE "id" = $1`, [
    pageRow.rows[0].id,
  ]);

  // Visiting the custom host (via x-forwarded-host) serves the page with a
  // host-relative canonical and no namesranker.com in the canonical URL.
  const customPage = await page.request.get(`${baseURL}/`, {
    headers: { "x-forwarded-host": domain },
  });
  expect(customPage.status()).toBe(200);
  const body = await customPage.text();
  expect(body).toContain("Iris Vance");

  const customReq = await page.request.get(`${baseURL}/`, {
    headers: { "x-forwarded-host": domain },
  });
  const customBody = await customReq.text();
  const canonicalMatch = customBody.match(/rel="canonical" href="([^"]+)"/);
  expect(canonicalMatch).not.toBeNull();
  expect(canonicalMatch![1]).toContain(domain);
  expect(canonicalMatch![1]).not.toContain("namesranker.com");

  // The base domain still serves the page with the namesranker canonical.
  const baseReq = await page.request.get("/iris-vance");
  expect(baseReq.status()).toBe(200);
  const baseBody = await baseReq.text();
  const baseCanonical = baseBody.match(/rel="canonical" href="([^"]+)"/);
  expect(baseCanonical![1]).toContain("namesranker.com");

  // Remove the domain → back to the form.
  await page.goto("/settings/user-data");
  await page.getByTestId("custom-domain-remove").click();
  await expect(page.getByTestId("custom-domain-form")).toBeVisible();
});
