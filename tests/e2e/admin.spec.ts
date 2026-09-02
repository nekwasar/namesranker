import { test, expect, APIRequestContext } from "@playwright/test";
import { cleanup, setUserAdmin } from "./helpers/db";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

let api: APIRequestContext;

test.beforeAll(async ({ playwright }) => {
  api = await playwright.request.newContext({ baseURL });
});

test.afterAll(async () => {
  await api.dispose();
  await cleanup("e2e-admin");
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

// Seed a second user who owns a PENDING page that needs moderation.
async function seedPendingPage(name: string, path: string): Promise<string> {
  const db = await import("./helpers/db");
  const client = await db.getDb();
  const ownerEmail = `e2e-admin-owner-${Date.now()}@example.com`;
  const adminEmail = `e2e-admin-admin-${Date.now()}@example.com`;

  // Create both users + the pending page via raw SQL (avoids Prisma in Playwright).
  const owner = await client.query(
    `INSERT INTO "User" ("id", "email", "updatedAt") VALUES (gen_random_uuid(), $1, now()) RETURNING "id"`,
    [ownerEmail]
  );
  await client.query(
    `INSERT INTO "User" ("id", "email", "updatedAt") VALUES (gen_random_uuid(), $1, now()) RETURNING "id"`,
    [adminEmail]
  );
  await client.query(
    `INSERT INTO "NameClaim" ("id", "slug", "wordCount", "type", "claimedById")
     VALUES (gen_random_uuid(), $1, 2, 'STANDARD', $2)`,
    [path, owner.rows[0].id]
  );
  await client.query(
    `INSERT INTO "Page" ("id", "ownerId", "isHub", "path", "title", "descriptor", "status", "updatedAt", "createdAt")
     VALUES (gen_random_uuid(), $1, true, $2, $3, 'Illustrator · Austin, TX', 'PENDING', now(), now())`,
    [owner.rows[0].id, path, name]
  );

  return { ownerEmail, adminEmail }.adminEmail;
}

test("admin approves a pending page which goes live and is audited", async ({ page }) => {
  const adminEmail = `e2e-admin-a-${Date.now()}@example.com`;
  const name = `Grace Liu`;
  const path = `grace-liu-${Date.now()}`;

  // Seed a pending page belonging to another user, then sign in the owner's admin.
  await seedPendingPage(name, path);

  // Sign in as the admin (creates/upserts the user) then promote to admin.
  await signIn(page, adminEmail, "/settings");
  await setUserAdmin(adminEmail);

  // requireAdmin reads the DB role per request, so the existing session is enough.
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Admin" })).toBeVisible();

  // The pending page appears in the Pages tab.
  await expect(page.getByTestId(`admin-approve-${path}`)).toBeVisible();

  // Approve it.
  await page.getByTestId(`admin-approve-${path}`).click();
  await expect(page.getByTestId("admin-flash")).toContainText("Done");

  // The page is now LIVE on the public route.
  await page.goto(`/${path}`);
  await expect(page.getByRole("heading", { name })).toBeVisible();

  // Re-enter admin and find the audit entry.
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Admin" })).toBeVisible();
  await page.getByTestId("admin-tab-audit").click();
  await expect(page.getByTestId("admin-audit-list")).toBeVisible();
  await expect(page.getByTestId("admin-audit-list")).toContainText("page.approve");
});
