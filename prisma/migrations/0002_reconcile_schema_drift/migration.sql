-- Reconciles migration history with schema changes applied via `prisma db push`
-- between 0001_init (2026-06-12) and now. This project used db push for all
-- schema evolution instead of tracked migrations, so this single migration
-- captures everything that accumulated in that gap: 4 new tables, plus column
-- changes on 4 existing tables. Generated via a real shadow-database diff
-- (0001_init replayed, then diffed against the current schema.prisma), not
-- hand-written, so it's a byte-for-byte match of the actual drift.
--
-- Ordering note: this must run BEFORE 0002_enable_row_level_security's
-- successor (0003) can safely enable RLS on BlogSubscriber, SearchConsoleConnection,
-- AnalysisHistory, and DrippedEmail -- those tables don't exist until this runs.

-- AlterTable
ALTER TABLE "BlogPost" ADD COLUMN     "author" TEXT NOT NULL DEFAULT 'Aravindraj',
ADD COLUMN     "authorTitle" TEXT NOT NULL DEFAULT 'Founder, Optmizly';

-- AlterTable
ALTER TABLE "ClientReport" ADD COLUMN     "trafficCurrent" INTEGER,
ALTER COLUMN "trafficChange" DROP NOT NULL,
ALTER COLUMN "backlinksAdded" DROP NOT NULL,
ALTER COLUMN "domainAuthority" DROP NOT NULL,
ALTER COLUMN "domainAuthority" DROP DEFAULT,
ALTER COLUMN "pageAuthority" DROP NOT NULL,
ALTER COLUMN "pageAuthority" DROP DEFAULT,
ALTER COLUMN "backlinksTotal" DROP NOT NULL,
ALTER COLUMN "backlinksTotal" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Usage" ADD COLUMN     "limitEmailSent" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "totalInputTokens" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalOutputTokens" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "BlogSubscriber" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlogSubscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchConsoleConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessTokenEnc" TEXT NOT NULL,
    "refreshTokenEnc" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "sitesCache" TEXT,
    "sitesFetchedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SearchConsoleConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalysisHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contentSnippet" TEXT NOT NULL,
    "contentUrl" TEXT,
    "overallScore" INTEGER NOT NULL,
    "grade" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalysisHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DrippedEmail" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailType" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DrippedEmail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BlogSubscriber_email_key" ON "BlogSubscriber"("email");

-- CreateIndex
CREATE UNIQUE INDEX "SearchConsoleConnection_userId_key" ON "SearchConsoleConnection"("userId");

-- CreateIndex
CREATE INDEX "SearchConsoleConnection_userId_idx" ON "SearchConsoleConnection"("userId");

-- CreateIndex
CREATE INDEX "AnalysisHistory_userId_createdAt_idx" ON "AnalysisHistory"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "DrippedEmail_userId_idx" ON "DrippedEmail"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DrippedEmail_userId_emailType_key" ON "DrippedEmail"("userId", "emailType");

-- AddForeignKey
ALTER TABLE "SearchConsoleConnection" ADD CONSTRAINT "SearchConsoleConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisHistory" ADD CONSTRAINT "AnalysisHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrippedEmail" ADD CONSTRAINT "DrippedEmail_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
