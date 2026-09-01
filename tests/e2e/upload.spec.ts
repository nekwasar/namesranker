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

// A real 1×1 transparent PNG (valid magic bytes + full image structure).
const PNG_BYTES = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64"
);

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

test("photo upload works in onboarding and rejects non-images", async ({ page }) => {
  const email = `e2e-upload-onb-${Date.now()}@example.com`;
  await signIn(page, email);

  // Land on step 1, claim a two-word name, continue to step 2 (photo step).
  const tag = String(Date.now()).slice(-6);
  await page.fill('[data-testid="claim-name"]', `Ava ${tag}`);
  await expect(page.getByTestId("availability")).toBeVisible();
  await page.getByTestId("claim-submit").click();
  await expect(page.getByTestId("claim-success")).toBeVisible();
  await page.getByTestId("claim-continue").click();
  await page.waitForURL("**/onboarding?step=2");
  await expect(page.getByTestId("photo-uploader")).toBeVisible();

  // Uploading a non-image shows a clear error.
  await page
    .getByTestId("photo-file")
    .setInputFiles({ name: "note.txt", mimeType: "text/plain", buffer: Buffer.from("hello") });
  await expect(page.getByTestId("photo-error")).toContainText("isn't a supported image");

  // A real PNG uploads, preview appears with a same-origin /uploads URL.
  await page
    .getByTestId("photo-file")
    .setInputFiles({ name: "portrait.png", mimeType: "image/png", buffer: PNG_BYTES });
  const preview = page.getByTestId("photo-uploader").locator("img");
  await expect(preview).toBeVisible();
  const src = await preview.getAttribute("src");
  expect(src).toMatch(/^\/api\/files\/[0-9a-f-]{36}\.png$/);

  // The stored file is actually served as an image.
  const served = await page.request.get(src!);
  expect(served.status()).toBe(200);
  expect(served.headers()["content-type"]).toContain("image/png");

  // Remove clears the photo back to the empty state.
  await page.getByTestId("photo-remove").click();
  await expect(page.getByTestId("photo-uploader").getByText("No photo yet")).toBeVisible();
});

test("photo upload in settings round-trips to the public page", async ({ page }) => {
  const email = `e2e-upload-set-${Date.now()}@example.com`;
  const tag = String(Date.now()).slice(-6);
  await signIn(page, email);
  await claimAndPublish(page, `Leo ${tag}`);

  await page.goto("/settings/user-data");
  await expect(page.getByTestId("settings-photo-uploader")).toBeVisible();

  // Upload from the settings profile section.
  await page
    .getByTestId("settings-photo-file")
    .setInputFiles({ name: "headshot.png", mimeType: "image/png", buffer: PNG_BYTES });
  const preview = page.getByTestId("settings-photo-uploader").locator("img");
  await expect(preview).toBeVisible();
  const src = await preview.getAttribute("src");
  expect(src).toMatch(/^\/api\/files\//);

  // Save the profile and confirm the photo renders on the public page.
  await page.getByTestId("save-profile").click();
  await expect(page.getByTestId("save-flash")).toBeVisible();

  await page.goto(`/leo-${tag}`);
  const publicPhoto = page.locator(`img[src="${src}"]`);
  await expect(publicPhoto).toBeVisible();

  // Remove from settings — the public page photo goes away too.
  await page.goto("/settings/user-data");
  await page.getByTestId("settings-photo-remove").click();
  await page.getByTestId("save-profile").click();
  await expect(page.getByTestId("save-flash")).toBeVisible();
  await page.goto(`/leo-${tag}`);
  await expect(page.locator(`img[src="${src}"]`)).toHaveCount(0);
});
