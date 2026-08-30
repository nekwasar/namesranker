import { Client } from "pg";
import "dotenv/config";

/**
 * Raw Postgres helper for e2e tests. Avoids importing the Prisma client
 * (whose generated output uses import.meta and breaks Playwright's loader).
 * Used for seeding tokens / cleaning up between runs.
 */

let client: Client | null = null;

export async function getDb(): Promise<Client> {
  if (!client) {
    client = new Client({
      connectionString: process.env.DATABASE_URL,
    });
    await client.connect();
  }
  return client;
}

export async function seedExpiredToken(email: string, rawToken: string): Promise<void> {
  const db = await getDb();
  const { createHash } = await import("node:crypto");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  await db.query(
    `INSERT INTO "MagicLinkToken" ("id", "tokenHash", "email", "expiresAt", "createdAt")
     VALUES (gen_random_uuid(), $1, $2, now() - interval '1 hour', now())`,
    [tokenHash, email]
  );
}

export async function setUserPremium(email: string): Promise<void> {
  const db = await getDb();
  await db.query(`UPDATE "User" SET "plan" = 'PREMIUM' WHERE "email" = $1`, [email]);
}

export async function cleanup(emailPrefix: string): Promise<void> {
  const db = await getDb();
  await db.query(`DELETE FROM "MagicLinkToken" WHERE "email" ILIKE $1`, [`${emailPrefix}%`]);
  await db.query(`DELETE FROM "User" WHERE "email" ILIKE $1`, [`${emailPrefix}%`]);
}

export async function closeDb(): Promise<void> {
  if (client) {
    await client.end();
    client = null;
  }
}
