-- CreateTable
CREATE TABLE "KeywordListProject" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targetLocation" TEXT NOT NULL DEFAULT 'US',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KeywordListProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KeywordResearchResult" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "isSeed" BOOLEAN NOT NULL DEFAULT false,
    "searchVolume" INTEGER,
    "difficulty" INTEGER,
    "cpc" DOUBLE PRECISION,
    "trend" TEXT,
    "intent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KeywordResearchResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KeywordListProject_userId_idx" ON "KeywordListProject"("userId");

-- CreateIndex
CREATE INDEX "KeywordResearchResult_projectId_idx" ON "KeywordResearchResult"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "KeywordResearchResult_projectId_keyword_key" ON "KeywordResearchResult"("projectId", "keyword");

-- AddForeignKey
ALTER TABLE "KeywordListProject" ADD CONSTRAINT "KeywordListProject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KeywordResearchResult" ADD CONSTRAINT "KeywordResearchResult_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "KeywordListProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enable RLS to match the project-wide policy set in 0003_enable_row_level_security
-- (Prisma's table-owner connection is exempt from RLS regardless of policy count,
-- so this only blocks the unused Supabase PostgREST path -- see that migration's
-- header comment for the full rationale).
ALTER TABLE public."KeywordListProject" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."KeywordResearchResult" ENABLE ROW LEVEL SECURITY;
