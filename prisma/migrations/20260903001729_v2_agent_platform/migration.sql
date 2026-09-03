-- CreateEnum
CREATE TYPE "PermissionLevel" AS ENUM ('NEVER_TOUCH', 'DRAFT_ONLY', 'COPY_APPROVE', 'FULL_AUTO');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "SyncedProfileStatus" AS ENUM ('DISCOVERED', 'CONNECTED', 'ERRORED', 'DISCONNECTED');

-- CreateEnum
CREATE TYPE "PublishedItemStatus" AS ENUM ('QUEUED', 'PUBLISHED', 'FAILED');

-- CreateEnum
CREATE TYPE "PitchStatus" AS ENUM ('MATCHED', 'DRAFTED', 'APPROVED', 'SENT', 'ACCEPTED', 'REJECTED', 'IGNORED');

-- CreateTable
CREATE TABLE "AgentState" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "footprint" JSONB,
    "permissionEnvelope" JSONB NOT NULL,
    "notes" JSONB,
    "resumeUrl" TEXT,
    "resumeParsedAt" TIMESTAMP(3),
    "discoveryScanAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationMessage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "toolCalls" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "payload" JSONB,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApprovalItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "tool" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ok',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncedProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "displayName" TEXT,
    "url" TEXT,
    "descriptor" TEXT,
    "status" "SyncedProfileStatus" NOT NULL DEFAULT 'DISCOVERED',
    "oauthRef" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncedProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublishedItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceId" TEXT,
    "platform" TEXT NOT NULL,
    "url" TEXT,
    "canonicalUrl" TEXT,
    "status" "PublishedItemStatus" NOT NULL DEFAULT 'QUEUED',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublishedItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PitchOpportunity" (
    "id" TEXT NOT NULL,
    "vertical" TEXT NOT NULL,
    "niche" TEXT,
    "platformType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactUrl" TEXT,
    "notes" TEXT,
    "acceptsGuest" BOOLEAN NOT NULL DEFAULT true,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PitchOpportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pitch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "status" "PitchStatus" NOT NULL DEFAULT 'MATCHED',
    "angle" TEXT,
    "sentAt" TIMESTAMP(3),
    "replyAt" TIMESTAMP(3),
    "replyStatus" TEXT,
    "notes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pitch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WatchedQuery" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "professionTagged" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WatchedQuery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RankSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "watchedQueryId" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "position" INTEGER,
    "url" TEXT,
    "raw" JSONB,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RankSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AgentState_userId_key" ON "AgentState"("userId");

-- CreateIndex
CREATE INDEX "ConversationMessage_userId_createdAt_idx" ON "ConversationMessage"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ApprovalItem_userId_status_idx" ON "ApprovalItem"("userId", "status");

-- CreateIndex
CREATE INDEX "WorkLog_userId_createdAt_idx" ON "WorkLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SyncedProfile_userId_idx" ON "SyncedProfile"("userId");

-- CreateIndex
CREATE INDEX "PublishedItem_userId_idx" ON "PublishedItem"("userId");

-- CreateIndex
CREATE INDEX "PitchOpportunity_vertical_active_idx" ON "PitchOpportunity"("vertical", "active");

-- CreateIndex
CREATE INDEX "Pitch_userId_status_idx" ON "Pitch"("userId", "status");

-- CreateIndex
CREATE INDEX "Pitch_opportunityId_idx" ON "Pitch"("opportunityId");

-- CreateIndex
CREATE INDEX "WatchedQuery_userId_idx" ON "WatchedQuery"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WatchedQuery_userId_query_key" ON "WatchedQuery"("userId", "query");

-- CreateIndex
CREATE INDEX "RankSnapshot_userId_query_capturedAt_idx" ON "RankSnapshot"("userId", "query", "capturedAt");

-- AddForeignKey
ALTER TABLE "AgentState" ADD CONSTRAINT "AgentState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationMessage" ADD CONSTRAINT "ConversationMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalItem" ADD CONSTRAINT "ApprovalItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkLog" ADD CONSTRAINT "WorkLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncedProfile" ADD CONSTRAINT "SyncedProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublishedItem" ADD CONSTRAINT "PublishedItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pitch" ADD CONSTRAINT "Pitch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pitch" ADD CONSTRAINT "Pitch_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "PitchOpportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchedQuery" ADD CONSTRAINT "WatchedQuery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RankSnapshot" ADD CONSTRAINT "RankSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RankSnapshot" ADD CONSTRAINT "RankSnapshot_watchedQueryId_fkey" FOREIGN KEY ("watchedQueryId") REFERENCES "WatchedQuery"("id") ON DELETE CASCADE ON UPDATE CASCADE;
