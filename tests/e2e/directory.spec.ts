import { test, expect } from "@playwright/test";
import { getDb, cleanup } from "./helpers/db";

test.beforeEach(async () => {
  await cleanup("e2e-dir-");
});

test.afterAll(async () => {
  await cleanup("e2e-dir-");
});

// Insert a live hub page + owner directly into the DB so the directory has
// realistic rows to search (same shapes onboarding creates).
async function seedDirectoryPage(
  path: string,
  title: string,
  descriptor: string,
  email: string,
  publishedAt: string
): Promise<void> {
  const db = await getDb();
  await db.query(
    `INSERT INTO "User" ("id", "email", "plan", "createdAt", "updatedAt") VALUES (gen_random_uuid(), $1, 'FREE', now(), now()) RETURNING "id"`,
    [email]
  );
  const user = await db.query(`SELECT "id" FROM "User" WHERE "email" = $1`, [email]);
  const userId = user.rows[0].id;
  await db.query(
    `INSERT INTO "Page" ("id", "ownerId", "isHub", "path", "title", "descriptor", "status", "publishedAt", "createdAt", "updatedAt")
     VALUES (gen_random_uuid(), $1, true, $2, $3, $4, 'LIVE', $5::timestamp, now(), now())`,
    [userId, path, title, descriptor, publishedAt]
  );
  await db.query(
    `INSERT INTO "NameClaim" ("id", "slug", "wordCount", "type", "status", "claimedById", "claimedAt")
     VALUES (gen_random_uuid(), $1, 2, 'STANDARD', 'CLAIMED', $2, $3::timestamp)`,
    [path, userId, publishedAt]
  );
}

test("directory lists live hub pages with descriptors", async ({ page }) => {
  await seedDirectoryPage(
    "john-smith-civil",
    "John Smith — Civil Engineer",
    "Civil Engineer · Dallas, TX",
    "e2e-dir-john@example.com",
    "2026-01-01"
  );
  await seedDirectoryPage(
    "john-smith-vet",
    "John Smith — Veterinarian",
    "Veterinarian · Portland, OR",
    "e2e-dir-john2@example.com",
    "2026-01-02"
  );
  await seedDirectoryPage(
    "emily-chen",
    "Emily Chen — Product Designer",
    "Product Designer · Austin, TX",
    "e2e-dir-emily@example.com",
    "2026-01-03"
  );

  await page.goto("/names");
  await expect(page.getByRole("heading", { name: /Who owns their name/i })).toBeVisible();

  // Both John Smiths render with their descriptors (disambiguation).
  await expect(page.getByText("John Smith").first()).toBeVisible();
  await expect(page.getByText(/Civil Engineer · Dallas, TX/)).toBeVisible();
  await expect(page.getByText(/Veterinarian · Portland, OR/)).toBeVisible();
  await expect(page.getByText(/Emily Chen/)).toBeVisible();
});

test("search by name filters the directory", async ({ page }) => {
  await seedDirectoryPage(
    "john-smith-civil",
    "John Smith — Civil Engineer",
    "Civil Engineer · Dallas, TX",
    "e2e-dir-john@example.com",
    "2026-01-01"
  );
  await seedDirectoryPage(
    "emily-chen",
    "Emily Chen — Product Designer",
    "Product Designer · Austin, TX",
    "e2e-dir-emily@example.com",
    "2026-01-02"
  );

  await page.goto("/names");
  await page.fill('[data-testid="directory-query"]', "smith");
  await page.getByTestId("directory-submit").click();

  await expect(page.getByText("John Smith").first()).toBeVisible();
  await expect(page.getByText(/Emily Chen/)).toHaveCount(0);
});

test("profession filter narrows results", async ({ page }) => {
  await seedDirectoryPage(
    "john-smith-civil",
    "John Smith — Civil Engineer",
    "Civil Engineer · Dallas, TX",
    "e2e-dir-john@example.com",
    "2026-01-01"
  );
  await seedDirectoryPage(
    "emily-chen",
    "Emily Chen — Product Designer",
    "Product Designer · Austin, TX",
    "e2e-dir-emily@example.com",
    "2026-01-02"
  );

  await page.goto("/names");
  await page.getByTestId("directory-profession").selectOption({ label: "Civil Engineer" });
  await page.waitForURL(/profession=/);

  await expect(page.getByText("John Smith").first()).toBeVisible();
  await expect(page.getByText(/Emily Chen/)).toHaveCount(0);
});

test("directory shows pagination across many rows", async ({ page }) => {
  for (let i = 1; i <= 26; i++) {
    await seedDirectoryPage(
      `person-${i}`,
      `Person Number ${i}`,
      "Writer",
      `e2e-dir-p${i}@example.com`,
      `2026-01-${String((i % 28) + 1).padStart(2, "0")}`
    );
  }

  await page.goto("/names");
  await expect(page.getByTestId("directory-pagination")).toBeVisible();
  await expect(page.getByTestId("directory-grid").locator("> a")).toHaveCount(12);
  await expect(page.getByText(/Page 1 of 3/)).toBeVisible();

  await page.getByRole("link", { name: "Next →" }).click();
  await expect(page.getByText(/Page 2 of 3/)).toBeVisible();
  // A page-2 row is visible.
  await expect(page.getByText(/Person Number 13/)).toBeVisible();
});

test("directory page sets canonical URL", async ({ page }) => {
  await page.goto("/names");
  const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
  expect(canonical).toBe("https://namesranker.com/names");
});
