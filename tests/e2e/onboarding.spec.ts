import { test, expect, APIRequestContext } from "@playwright/test";
import { cleanup } from "./helpers/db";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

let api: APIRequestContext;

test.beforeAll(async ({ playwright }) => {
  api = await playwright.request.newContext({ baseURL });
});

test.afterAll(async () => {
  await api.dispose();
  await cleanup("e2e-onb");
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

async function claimFirst(page: import("@playwright/test").Page, name: string) {
  await page.fill('[data-testid="claim-name"]', name);
  await expect(page.getByTestId("availability")).toBeVisible();
  await page.getByTestId("claim-submit").click();
  await expect(page.getByTestId("claim-success")).toBeVisible();
  await page.getByTestId("claim-continue").click();
  await page.waitForURL("**/onboarding?step=2");
  await expect(page.getByTestId("step-2")).toBeVisible();
}

test("full 7-step wizard publishes a live page", async ({ page }) => {
  const email = `e2e-onb-full-${Date.now()}@example.com`;
  await signIn(page, email);

  // Step 1 — claim the name.
  await claimFirst(page, "Taylor Brooks");

  // Step 2 — descriptor + bio.
  await page.fill('[data-testid="descriptor-input"]', "Illustrator · Portland, OR");
  await page.fill('[data-testid="bio-input"]', "Illustrator who draws comics and murals.");
  await page.getByTestId("wizard-continue").click();
  await page.waitForURL("**/onboarding?step=3");
  await expect(page.getByTestId("step-3")).toBeVisible();

  // Step 3 — links & socials.
  await page.fill('[data-testid="social-platform-0"]', "Instagram");
  await page.fill('[data-testid="social-url-0"]', "https://instagram.com/taylorbrooks");
  await page.getByTestId("wizard-continue").click();
  await page.waitForURL("**/onboarding?step=4");
  await expect(page.getByTestId("step-4")).toBeVisible();

  // Step 4 — experience & projects.
  await page.fill('[data-testid="experience-role-0"]', "Freelance Illustrator");
  await page.fill('[data-testid="experience-company-0"]', "Self-employed");
  await page.fill('[data-testid="project-title-0"]', "Comic: The Long Way Home");
  await page.getByTestId("wizard-continue").click();
  await page.waitForURL("**/onboarding?step=5");
  await expect(page.getByTestId("step-5")).toBeVisible();

  // Step 5 — publications & testimonials.
  await page.fill('[data-testid="publication-title-0"]', "Sketching in Public");
  await page.fill('[data-testid="testimonial-author-0"]', "Riley Chen");
  await page.getByTestId("wizard-continue").click();
  await page.waitForURL("**/onboarding?step=6");
  await expect(page.getByTestId("step-6")).toBeVisible();

  // Step 6 — import connectors.
  await page.fill('[data-testid="connector-url-rss"]', "https://taylorbrooks.com/feed.xml");
  await page.getByTestId("wizard-continue").click();
  await page.waitForURL("**/onboarding?step=7");
  await expect(page.getByTestId("step-7")).toBeVisible();

  // Live preview reflects everything entered.
  const preview = page.getByTestId("page-preview");
  await expect(preview).toContainText("Taylor Brooks");
  await expect(preview).toContainText("Illustrator · Portland, OR");
  await expect(preview).toContainText("Sketching in Public");

  // Step 7 — publish.
  await page.getByTestId("publish-button").click();
  await expect(page.getByTestId("publish-success")).toBeVisible();

  // The public page is live with the entered content.
  await page.goto("/taylor-brooks");
  await expect(page.getByRole("heading", { name: "Taylor Brooks" })).toBeVisible();
  await expect(page.getByText(/Illustrator · Portland, OR/)).toBeVisible();
  await expect(page.getByText(/Comic: The Long Way Home/)).toBeVisible();

  // Returning users go straight to /settings.
  const res = await api.post("/api/auth/magic-link", { data: { email } });
  const { devUrl } = (await res.json()) as { devUrl: string };
  await page.goto(devUrl);
  await page.waitForURL("**/settings");
});

test("wizard resumes at the correct step", async ({ page }) => {
  const email = `e2e-onb-resume-${Date.now()}@example.com`;
  await signIn(page, email);

  await claimFirst(page, "Dana Kim");
  await page.fill('[data-testid="descriptor-input"]', "Data Engineer · Seattle");
  await page.getByTestId("wizard-continue").click();
  await page.waitForURL("**/onboarding?step=3");

  // Leave mid-wizard.
  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();

  // Coming back resumes at step 3 — not step 1.
  await page.goto("/onboarding");
  await expect(page.getByTestId("step-3")).toBeVisible();
  await expect(page.getByTestId("wizard-progress")).toContainText("Links");
});

test("skip any step; skipping the final step lands in settings", async ({ page }) => {
  const email = `e2e-onb-skip-${Date.now()}@example.com`;
  await signIn(page, email);

  await claimFirst(page, "Sam Ortiz");
  await expect(page.getByTestId("step-2")).toBeVisible();

  // Skip every content step.
  for (const target of [3, 4, 5, 6]) {
    await page.getByTestId("wizard-skip").click();
    await page.waitForURL(`**/onboarding?step=${target}`);
  }
  await page.getByTestId("wizard-skip").click();
  await page.waitForURL("**/onboarding?step=7");

  // Skipping the publish step defers completion → settings.
  await page.getByTestId("finish-later").click();
  await page.waitForURL("**/settings");
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
});
