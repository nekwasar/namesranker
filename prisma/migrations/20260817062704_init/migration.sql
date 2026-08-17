-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('FREE', 'PREMIUM');

-- CreateEnum
CREATE TYPE "ClaimType" AS ENUM ('STANDARD', 'KEYWORD', 'ONE_WORD', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('CLAIMED', 'PROTECTED', 'PENDING_RELEASE', 'RELEASED');

-- CreateEnum
CREATE TYPE "PageStatus" AS ENUM ('DRAFT', 'PENDING', 'LIVE', 'REJECTED');

-- CreateEnum
CREATE TYPE "ContentBlockType" AS ENUM ('BIO', 'PHOTO', 'EXPERIENCE', 'PROJECT', 'TESTIMONIAL', 'SOCIAL', 'PUBLICATION', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ImportConnectorType" AS ENUM ('RSS', 'GITHUB', 'YOUTUBE');

-- CreateEnum
CREATE TYPE "ShowcaseStatus" AS ENUM ('PENDING', 'LIVE', 'REJECTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "plan" "Plan" NOT NULL DEFAULT 'FREE',
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "onboardedAt" TIMESTAMP(3),
    "onboardingStep" INTEGER,
    "profilePhotoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NameClaim" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "wordCount" INTEGER NOT NULL,
    "type" "ClaimType" NOT NULL,
    "status" "ClaimStatus" NOT NULL DEFAULT 'CLAIMED',
    "claimedById" TEXT NOT NULL,
    "keyword" TEXT,
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "graceUntil" TIMESTAMP(3),

    CONSTRAINT "NameClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Page" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "isHub" BOOLEAN NOT NULL DEFAULT false,
    "path" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "descriptor" TEXT,
    "status" "PageStatus" NOT NULL DEFAULT 'DRAFT',
    "seoScore" INTEGER,
    "customDomain" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Page_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentBlock" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "type" "ContentBlockType" NOT NULL,
    "payload" JSONB NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportConnector" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "type" "ImportConnectorType" NOT NULL,
    "externalUrl" TEXT NOT NULL,
    "autoSync" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportConnector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportedContent" (
    "id" TEXT NOT NULL,
    "connectorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "content" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportedContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Keyword" (
    "id" TEXT NOT NULL,
    "profession" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,

    CONSTRAINT "Keyword_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NameMonitoringRule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nameToMonitor" TEXT NOT NULL,
    "lastAlertAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NameMonitoringRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchConsoleLink" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "propertyUrl" TEXT NOT NULL,
    "oauthRefreshToken" TEXT NOT NULL,
    "lastImportAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchConsoleLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShowcaseEntry" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "status" "ShowcaseStatus" NOT NULL DEFAULT 'PENDING',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShowcaseEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MagicLinkToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MagicLinkToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeSubscriptionId_key" ON "User"("stripeSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "NameClaim_slug_key" ON "NameClaim"("slug");

-- CreateIndex
CREATE INDEX "NameClaim_claimedById_idx" ON "NameClaim"("claimedById");

-- CreateIndex
CREATE UNIQUE INDEX "Page_path_key" ON "Page"("path");

-- CreateIndex
CREATE UNIQUE INDEX "Page_customDomain_key" ON "Page"("customDomain");

-- CreateIndex
CREATE INDEX "Page_ownerId_idx" ON "Page"("ownerId");

-- CreateIndex
CREATE INDEX "Page_status_idx" ON "Page"("status");

-- CreateIndex
CREATE INDEX "ContentBlock_pageId_idx" ON "ContentBlock"("pageId");

-- CreateIndex
CREATE INDEX "ImportConnector_pageId_idx" ON "ImportConnector"("pageId");

-- CreateIndex
CREATE INDEX "ImportedContent_connectorId_idx" ON "ImportedContent"("connectorId");

-- CreateIndex
CREATE INDEX "Keyword_profession_idx" ON "Keyword"("profession");

-- CreateIndex
CREATE UNIQUE INDEX "Keyword_profession_keyword_key" ON "Keyword"("profession", "keyword");

-- CreateIndex
CREATE INDEX "NameMonitoringRule_userId_idx" ON "NameMonitoringRule"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SearchConsoleLink_pageId_key" ON "SearchConsoleLink"("pageId");

-- CreateIndex
CREATE INDEX "SearchConsoleLink_pageId_idx" ON "SearchConsoleLink"("pageId");

-- CreateIndex
CREATE UNIQUE INDEX "ShowcaseEntry_pageId_key" ON "ShowcaseEntry"("pageId");

-- CreateIndex
CREATE UNIQUE INDEX "ShowcaseEntry_domain_path_key" ON "ShowcaseEntry"("domain", "path");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "MagicLinkToken_tokenHash_key" ON "MagicLinkToken"("tokenHash");

-- CreateIndex
CREATE INDEX "MagicLinkToken_email_idx" ON "MagicLinkToken"("email");

-- AddForeignKey
ALTER TABLE "NameClaim" ADD CONSTRAINT "NameClaim_claimedById_fkey" FOREIGN KEY ("claimedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Page" ADD CONSTRAINT "Page_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentBlock" ADD CONSTRAINT "ContentBlock_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportConnector" ADD CONSTRAINT "ImportConnector_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportedContent" ADD CONSTRAINT "ImportedContent_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "ImportConnector"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NameMonitoringRule" ADD CONSTRAINT "NameMonitoringRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShowcaseEntry" ADD CONSTRAINT "ShowcaseEntry_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
