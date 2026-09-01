import { test, expect, APIRequestContext } from "@playwright/test";
import { cleanup } from "./helpers/db";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const STRONG_PASSWORD = "Sup3r-secret!";

let api: APIRequestContext;

test.beforeAll(async ({ playwright }) => {
  api = await playwright.request.newContext({ baseURL });
});

test.afterAll(async () => {
  await api.dispose();
  await cleanup("e2e-auth-");
});

test("signup page validates a strong password and completes", async ({ page }) => {
  await page.goto("/signup");
  await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();

  // Weak password: the checklist shows unmet rules.
  await page.getByTestId("signup-password").fill("short");
  await expect(page.getByTestId("signup-strength")).toContainText("At least 8 characters");

  const email = `e2e-auth-signup-${Date.now()}@example.com`;
  await page.getByTestId("signup-first").fill("Ada");
  await page.getByTestId("signup-last").fill("Lovelace");
  await page.getByTestId("signup-email").fill(email);
  await page.getByTestId("signup-password").fill(STRONG_PASSWORD);
  await page.getByTestId("signup-submit").click();
  await expect(page.getByTestId("signup-success")).toBeVisible();
  await expect(page.getByTestId("signup-success")).toContainText(email);
});

test("full flow: signup → verify email → sign in with password", async ({ page }) => {
  const email = `e2e-auth-full-${Date.now()}@example.com`;

  // Sign up via API and grab the dev verification URL.
  const res = await api.post("/api/auth/signup", {
    data: { firstName: "Ada", lastName: "Lovelace", email, password: STRONG_PASSWORD },
  });
  expect(res.status()).toBe(200);
  const { devUrl } = (await res.json()) as { devUrl: string };

  // Verification signs the new user in and sends them to onboarding.
  await page.goto(devUrl);
  await page.waitForURL("**/onboarding");

  // Sign out, then sign back in with email + password.
  await api.post("/api/auth/signout");
  await page.goto("/login");
  await page.getByTestId("login-email").fill(email);
  await page.getByTestId("login-password").fill(STRONG_PASSWORD);
  await page.getByTestId("login-submit").click();
  await page.waitForURL("**/onboarding");
});

test("signin shows an error for a wrong password", async ({ page }) => {
  const email = `e2e-auth-wrong-${Date.now()}@example.com`;
  const res = await api.post("/api/auth/signup", {
    data: { firstName: "Ada", lastName: "Lovelace", email, password: STRONG_PASSWORD },
  });
  const { devUrl } = (await res.json()) as { devUrl: string };
  await page.goto(devUrl);
  await page.waitForURL("**/onboarding");
  await api.post("/api/auth/signout");

  await page.goto("/login");
  await page.getByTestId("login-email").fill(email);
  await page.getByTestId("login-password").fill("Wrong-password-1!");
  await page.getByTestId("login-submit").click();
  await expect(page.getByTestId("login-error")).toContainText("Incorrect email or password");
});

test("unverified accounts cannot sign in with a password", async ({ page }) => {
  const email = `e2e-auth-unverified-${Date.now()}@example.com`;
  await api.post("/api/auth/signup", {
    data: { firstName: "Ada", lastName: "Lovelace", email, password: STRONG_PASSWORD },
  });

  await page.goto("/login");
  await page.getByTestId("login-email").fill(email);
  await page.getByTestId("login-password").fill(STRONG_PASSWORD);
  await page.getByTestId("login-submit").click();
  await expect(page.getByTestId("login-error")).toContainText("email isn't verified");
});

test("magic link method still sends a link", async ({ page }) => {
  await page.goto("/login");
  await page.getByTestId("login-method-magic").click();
  await expect(page.getByTestId("login-magic-form")).toBeVisible();
  await page.getByTestId("login-magic-email").fill(`e2e-auth-magic-${Date.now()}@example.com`);
  await page.getByTestId("login-magic-submit").click();
  await expect(page.getByTestId("login-sent")).toBeVisible();
});

test("forgot password → reset → sign in with the new password", async ({ page }) => {
  const email = `e2e-auth-reset-${Date.now()}@example.com`;
  const res = await api.post("/api/auth/signup", {
    data: { firstName: "Ada", lastName: "Lovelace", email, password: STRONG_PASSWORD },
  });
  const { devUrl } = (await res.json()) as { devUrl: string };
  await page.goto(devUrl);
  await page.waitForURL("**/onboarding");
  await api.post("/api/auth/signout");

  // Request a reset and open the emailed link.
  const forgot = await api.post("/api/auth/forgot-password", { data: { email } });
  expect(forgot.status()).toBe(200);
  const { devUrl: resetUrl } = (await forgot.json()) as { devUrl: string };
  await page.goto(resetUrl);
  await expect(page.getByRole("heading", { name: "Choose a new password" })).toBeVisible();

  const newPassword = "Br4nd-New!pass";
  await page.getByTestId("reset-password").fill(newPassword);
  await page.getByTestId("reset-confirm").fill(newPassword);
  await page.getByTestId("reset-submit").click();
  await expect(page.getByTestId("reset-done")).toBeVisible();

  // Old password no longer works; new one does.
  await page.goto("/login");
  await page.getByTestId("login-email").fill(email);
  await page.getByTestId("login-password").fill(STRONG_PASSWORD);
  await page.getByTestId("login-submit").click();
  await expect(page.getByTestId("login-error")).toContainText("Incorrect email or password");

  await page.getByTestId("login-password").fill(newPassword);
  await page.getByTestId("login-submit").click();
  await page.waitForURL("**/onboarding");
});

test("newsletter form on the homepage subscribes an email", async ({ page }) => {
  await page.goto("/");
  const section = page.getByTestId("newsletter-section");
  await expect(section).toBeVisible();

  // Invalid email surfaces an inline error.
  await page.getByTestId("newsletter-email").fill("not-an-email");
  await page.getByTestId("newsletter-submit").click();
  await expect(page.getByTestId("newsletter-error")).toBeVisible();

  const email = `e2e-auth-newsletter-${Date.now()}@example.com`;
  await page.getByTestId("newsletter-email").fill(email);
  await page.getByTestId("newsletter-submit").click();
  await expect(page.getByTestId("newsletter-done")).toBeVisible();
});
