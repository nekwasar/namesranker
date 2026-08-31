import { test, expect, APIRequestContext } from "@playwright/test";
import { createServer, type Server } from "node:http";
import { cleanup } from "./helpers/db";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

let api: APIRequestContext;
let feedServer: Server;
let feedUrl: string;

test.beforeAll(async ({ playwright }) => {
  api = await playwright.request.newContext({ baseURL });

  // Serve a local RSS feed so the connector sync has a real, reachable URL.
  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>Imported Blog</title><link>http://127.0.0.1:4123</link>
<item>
  <title>My Latest Engineering Post</title>
  <link>http://127.0.0.1:4123/posts/latest</link>
  <description><![CDATA[<p>Full text of the post.</p>]]></description>
  <pubDate>Mon, 12 Aug 2024 09:00:00 GMT</pubDate>
</item>
<item>
  <title>Designing for Search</title>
  <link>http://127.0.0.1:4123/posts/seo</link>
  <description>Short description</description>
</item>
</channel></rss>`;

  feedServer = createServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "application/rss+xml" });
    res.end(rss);
  });
  await new Promise<void>((resolve) => feedServer.listen(4123, resolve));
  feedUrl = "http://127.0.0.1:4123/feed.xml";
});

test.afterAll(async () => {
  await api.dispose();
  await new Promise<void>((resolve) => feedServer.close(() => resolve()));
  await cleanup("e2e-");
});

async function signIn(page: import("@playwright/test").Page, email: string) {
  const res = await api.post("/api/auth/magic-link", { data: { email } });
  expect(res.status()).toBe(200);
  const { devUrl } = (await res.json()) as { devUrl: string };
  await page.goto(devUrl);
  await page.waitForURL("**/onboarding");
}

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

test("RSS connector sync pulls posts onto the public page", async ({ page }) => {
  const email = `e2e-import-rss-${Date.now()}@example.com`;
  await signIn(page, email);
  await claimAndPublish(page, "Jordan Reyes");

  // Add an RSS connector in settings and sync it.
  await page.goto("/settings/user-data");
  await expect(page.getByTestId("connector-add")).toBeVisible();
  await page.getByTestId("connector-type").selectOption("RSS");
  await page.fill('[data-testid="connector-url"]', feedUrl);
  await page.getByTestId("connector-add").click();
  await expect(page.getByTestId("connector-row")).toContainText("RSS");

  await page.getByTestId("connector-sync").click();
  await expect(page.getByTestId("connector-sync-status")).toContainText("Imported 2 new", {
    timeout: 15000,
  });

  // The imported posts render on the public page as publications.
  await page.goto("/jordan-reyes");
  await expect(page.getByRole("heading", { name: "Jordan Reyes" })).toBeVisible();
  await expect(page.getByText(/My Latest Engineering Post/)).toBeVisible();
  await expect(page.getByText(/Designing for Search/)).toBeVisible();

  // Syncing again skips duplicates.
  await page.goto("/settings/user-data");
  await page.getByTestId("connector-sync").click();
  await expect(page.getByTestId("connector-sync-status")).toContainText("already on page", {
    timeout: 15000,
  });
});
