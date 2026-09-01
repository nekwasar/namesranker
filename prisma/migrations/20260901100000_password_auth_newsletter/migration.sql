-- Password-based auth: first/last name, hashed password, email verification.
ALTER TABLE "User" ADD COLUMN "firstName" TEXT;
ALTER TABLE "User" ADD COLUMN "lastName" TEXT;
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;
ALTER TABLE "User" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);

-- Token purposes: MAGIC_LINK (existing), EMAIL_VERIFY, PASSWORD_RESET.
ALTER TABLE "MagicLinkToken" ADD COLUMN "purpose" TEXT NOT NULL DEFAULT 'MAGIC_LINK';
CREATE INDEX "MagicLinkToken_purpose_idx" ON "MagicLinkToken" ("purpose");

-- Newsletter subscribers (self-hosted, no third-party provider).
CREATE TABLE "NewsletterSubscriber" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'homepage',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NewsletterSubscriber_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "NewsletterSubscriber_email_key" ON "NewsletterSubscriber" ("email");
