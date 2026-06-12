-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('FREE', 'PRO', 'AGENCY');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'EXPIRED', 'PAST_DUE', 'PAUSED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "plan" "Plan" NOT NULL DEFAULT 'FREE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "website" TEXT NOT NULL,
    "industry" TEXT,
    "reportTemplate" TEXT NOT NULL DEFAULT 'standard',
    "brandColor" TEXT NOT NULL DEFAULT '#6366f1',
    "logoUrl" TEXT,
    "trackKeywords" TEXT NOT NULL,
    "competitors" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientReport" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "keywordRankings" TEXT NOT NULL,
    "trafficChange" INTEGER NOT NULL,
    "backlinksAdded" INTEGER NOT NULL,
    "topPerformers" TEXT NOT NULL,
    "domainAuthority" DOUBLE PRECISION NOT NULL DEFAULT 45,
    "pageAuthority" DOUBLE PRECISION NOT NULL DEFAULT 52,
    "backlinksTotal" INTEGER NOT NULL DEFAULT 500,
    "reportHtml" TEXT NOT NULL,
    "reportPdfUrl" TEXT,
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "emailSentAt" TIMESTAMP(3),
    "clientViewed" BOOLEAN NOT NULL DEFAULT false,
    "clientViewedAt" TIMESTAMP(3),
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportTemplate" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sections" TEXT NOT NULL,
    "customText" TEXT,
    "footerText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dodoSubscriptionId" TEXT NOT NULL,
    "dodoCustomerId" TEXT NOT NULL,
    "dodoProductId" TEXT NOT NULL,
    "dodoPaymentId" TEXT,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "plan" "Plan" NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceFixerAudit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "industry" TEXT,
    "analyzedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lcp" DOUBLE PRECISION NOT NULL,
    "fid" DOUBLE PRECISION,
    "inp" DOUBLE PRECISION,
    "cls" DOUBLE PRECISION NOT NULL,
    "lcpScore" INTEGER NOT NULL,
    "fidScore" INTEGER,
    "clsScore" INTEGER NOT NULL,
    "overallScore" INTEGER NOT NULL,
    "projectedScore" INTEGER NOT NULL,
    "revenueLoss" DOUBLE PRECISION,
    "potentialRevenue" DOUBLE PRECISION,
    "fixTime" INTEGER NOT NULL,
    "fixCost" DOUBLE PRECISION NOT NULL,
    "fixes" TEXT NOT NULL,
    "totalFixes" INTEGER NOT NULL,
    "extendedMetrics" TEXT,
    "industryAvg" INTEGER,
    "industryRank" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PerformanceFixerAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIFixGeneration" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "fixType" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "beforeCode" TEXT NOT NULL,
    "afterCode" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "estimatedImpact" INTEGER NOT NULL,
    "applied" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIFixGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentOptimization" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "targetKeyword" TEXT NOT NULL,
    "contentUrl" TEXT,
    "detectedIntent" TEXT NOT NULL,
    "intentMatchScore" INTEGER NOT NULL,
    "intentSuggestions" TEXT NOT NULL,
    "entities" TEXT NOT NULL,
    "entityScore" INTEGER NOT NULL,
    "missingEntities" TEXT NOT NULL,
    "entityRelationships" TEXT NOT NULL,
    "lsiKeywords" TEXT NOT NULL,
    "missingLsi" TEXT NOT NULL,
    "lsiScore" INTEGER NOT NULL,
    "recommendedSchema" TEXT NOT NULL,
    "schemaJsonLd" TEXT NOT NULL,
    "mainTopic" TEXT NOT NULL,
    "subtopicsCovered" TEXT NOT NULL,
    "subtopicsMissing" TEXT NOT NULL,
    "topicCoverageScore" INTEGER NOT NULL,
    "pillarSuggestion" TEXT,
    "clusterSuggestions" TEXT,
    "internalLinkingOps" TEXT,
    "experienceScore" INTEGER NOT NULL,
    "expertiseScore" INTEGER NOT NULL,
    "authorityScore" INTEGER NOT NULL,
    "trustScore" INTEGER NOT NULL,
    "eeatOverall" INTEGER NOT NULL,
    "overallScore" INTEGER NOT NULL,
    "rewriteSuggestions" TEXT NOT NULL,
    "improvements" TEXT NOT NULL,
    "analyzedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentOptimization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogPost" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "contentType" TEXT NOT NULL DEFAULT 'markdown',
    "category" TEXT NOT NULL,
    "tags" TEXT NOT NULL DEFAULT '',
    "featuredImage" TEXT,
    "readingTime" TEXT NOT NULL DEFAULT '5 min read',
    "published" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "scheduledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentOptimizationFix" (
    "id" TEXT NOT NULL,
    "optimizationId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "issue" TEXT NOT NULL,
    "suggestion" TEXT NOT NULL,
    "beforeText" TEXT,
    "afterText" TEXT,
    "applied" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentOptimizationFix_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentIdeaProject" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "targetAudience" TEXT NOT NULL,
    "seedKeywords" TEXT NOT NULL,
    "competitors" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentIdeaProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentIdea" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "primaryKeyword" TEXT NOT NULL,
    "relatedKeywords" TEXT NOT NULL,
    "searchVolume" INTEGER NOT NULL,
    "difficulty" INTEGER NOT NULL,
    "cpc" DOUBLE PRECISION,
    "contentType" TEXT NOT NULL,
    "estimatedLength" INTEGER NOT NULL,
    "sections" TEXT NOT NULL,
    "entitiesNeeded" TEXT NOT NULL,
    "lsiKeywords" TEXT NOT NULL,
    "semanticGaps" TEXT NOT NULL,
    "eeatScore" INTEGER NOT NULL,
    "competitorCount" INTEGER NOT NULL,
    "opportunityScore" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'idea',
    "assignedTo" TEXT,
    "dueDate" TIMESTAMP(3),
    "aiOutline" TEXT,
    "aiIntro" TEXT,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentIdea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitorAnalysis" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "domainUrl" TEXT NOT NULL,
    "domainName" TEXT NOT NULL,
    "estimatedTraffic" INTEGER NOT NULL,
    "domainAuthority" DOUBLE PRECISION NOT NULL,
    "pageAuthority" DOUBLE PRECISION NOT NULL,
    "backlinksTotal" INTEGER NOT NULL,
    "backlinksNew" INTEGER NOT NULL,
    "topKeywords" TEXT NOT NULL,
    "keywordCount" INTEGER NOT NULL,
    "brandKeywords" TEXT NOT NULL,
    "topPages" TEXT NOT NULL,
    "contentCount" INTEGER NOT NULL,
    "avgContentLength" INTEGER NOT NULL,
    "topBacklinks" TEXT NOT NULL,
    "backlinksSource" TEXT NOT NULL,
    "gapKeywords" TEXT NOT NULL,
    "missingEntities" TEXT NOT NULL,
    "contentOpps" TEXT NOT NULL,
    "aiInsights" TEXT,
    "dataQuality" TEXT NOT NULL DEFAULT 'high',
    "lastAnalyzedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompetitorAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitorComparison" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "yourDomain" TEXT NOT NULL,
    "competitors" TEXT NOT NULL,
    "comparisonData" TEXT NOT NULL,
    "keywordOverlap" TEXT NOT NULL,
    "uniqueToYou" TEXT NOT NULL,
    "uniqueToThem" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompetitorComparison_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnPageAnalysis" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "targetKeyword" TEXT NOT NULL,
    "pageUrl" TEXT,
    "pageTitle" TEXT,
    "overallScore" INTEGER NOT NULL,
    "keywordScore" INTEGER NOT NULL,
    "headerScore" INTEGER NOT NULL,
    "metaScore" INTEGER NOT NULL,
    "imageScore" INTEGER NOT NULL,
    "linkScore" INTEGER NOT NULL,
    "readabilityScore" INTEGER NOT NULL,
    "keywordDensity" DOUBLE PRECISION NOT NULL,
    "keywordCount" INTEGER NOT NULL,
    "wordCount" INTEGER NOT NULL,
    "keywordData" TEXT NOT NULL,
    "headers" TEXT NOT NULL,
    "metaTags" TEXT NOT NULL,
    "images" TEXT NOT NULL,
    "links" TEXT NOT NULL,
    "readabilityData" TEXT NOT NULL,
    "fixes" TEXT NOT NULL,
    "appliedFixes" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "previousScore" INTEGER,
    "analyzedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnPageAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentCalendar" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "ideaId" TEXT,
    "title" TEXT NOT NULL,
    "publishDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentCalendar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RankTrackingProject" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "targetLocation" TEXT NOT NULL DEFAULT 'US',
    "deviceType" TEXT NOT NULL DEFAULT 'desktop',
    "trackKeywords" TEXT NOT NULL,
    "updateFrequency" TEXT NOT NULL DEFAULT 'daily',
    "lastUpdatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RankTrackingProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RankTrackingKeyword" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "searchVolume" INTEGER,
    "difficulty" INTEGER,
    "currentRank" INTEGER,
    "currentUrl" TEXT,
    "rankChange30d" INTEGER,
    "rankChange7d" INTEGER,
    "rankTrendPercent" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'tracking',
    "achievedRank" INTEGER,
    "notes" TEXT,
    "lastRanked" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RankTrackingKeyword_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RankHistory" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "keywordId" TEXT NOT NULL,
    "rank" INTEGER,
    "url" TEXT,
    "searchVolume" INTEGER,
    "checkedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RankHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RankAlert" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "alertType" TEXT NOT NULL,
    "threshold" INTEGER,
    "oldRank" INTEGER,
    "newRank" INTEGER,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RankAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocalSEOAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accountType" TEXT NOT NULL DEFAULT 'multi-location',
    "gbpConnected" BOOLEAN NOT NULL DEFAULT false,
    "gbpEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LocalSEOAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocalSEOLocation" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "website" TEXT,
    "gbpId" TEXT,
    "gmapsUrl" TEXT,
    "averageRating" DOUBLE PRECISION,
    "reviewCount" INTEGER,
    "localKeywords" TEXT NOT NULL,
    "pageViews" INTEGER,
    "calls" INTEGER,
    "directions" INTEGER,
    "citationScore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LocalSEOLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocalKeywordRank" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "searchType" TEXT NOT NULL DEFAULT 'local',
    "currentRank" INTEGER,
    "previousRank" INTEGER,
    "rankChange7d" INTEGER,
    "rankChange30d" INTEGER,
    "searchVolume" INTEGER,
    "difficulty" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LocalKeywordRank_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocalRankHistory" (
    "id" TEXT NOT NULL,
    "keywordId" TEXT NOT NULL,
    "rank" INTEGER,
    "checkedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LocalRankHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocalReview" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "reviewText" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "author" TEXT,
    "responded" BOOLEAN NOT NULL DEFAULT false,
    "responseText" TEXT,
    "flaggedAsNegative" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedDate" TIMESTAMP(3),

    CONSTRAINT "LocalReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocalCitation" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "businessPhone" TEXT NOT NULL,
    "businessAddress" TEXT NOT NULL,
    "nameMatches" BOOLEAN NOT NULL DEFAULT true,
    "phoneMatches" BOOLEAN NOT NULL DEFAULT true,
    "addressMatches" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'verified',
    "issueDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LocalCitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LLMVisibilityAnalysis" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "websiteUrl" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "llmVisibilityScore" INTEGER NOT NULL,
    "semanticRelevance" INTEGER NOT NULL,
    "retrievalLikelihood" INTEGER NOT NULL,
    "contentStructure" INTEGER NOT NULL,
    "answerability" INTEGER NOT NULL,
    "technicalAccess" INTEGER NOT NULL,
    "pagesAnalyzed" INTEGER NOT NULL,
    "totalWords" INTEGER NOT NULL,
    "topicsFound" INTEGER NOT NULL,
    "entitiesFound" INTEGER NOT NULL,
    "faqSections" INTEGER NOT NULL,
    "criticalGaps" TEXT NOT NULL,
    "warnings" TEXT NOT NULL,
    "opportunities" TEXT NOT NULL,
    "recommendations" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LLMVisibilityAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LLMVisibilityPage" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "pageScore" INTEGER NOT NULL,
    "semanticScore" INTEGER NOT NULL,
    "structureScore" INTEGER NOT NULL,
    "answerScore" INTEGER NOT NULL,
    "wordCount" INTEGER NOT NULL,
    "headingCount" INTEGER NOT NULL,
    "listCount" INTEGER NOT NULL,
    "faqCount" INTEGER NOT NULL,
    "mainTopic" TEXT,
    "subtopics" TEXT NOT NULL,
    "entities" TEXT NOT NULL,
    "retrievable" BOOLEAN NOT NULL,
    "retrievalReason" TEXT,
    "issues" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LLMVisibilityPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LLMQueryTest" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "queryType" TEXT NOT NULL,
    "retrieved" BOOLEAN NOT NULL,
    "retrievalScore" DOUBLE PRECISION NOT NULL,
    "topRetrievedPage" TEXT,
    "topRetrievedChunk" TEXT,
    "answer" TEXT,
    "answerQuality" INTEGER,
    "missingContent" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LLMQueryTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BacklinkDomainAnalysis" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "backlinksTotal" INTEGER NOT NULL DEFAULT 0,
    "dofollowLinks" INTEGER NOT NULL DEFAULT 0,
    "nofollowLinks" INTEGER NOT NULL DEFAULT 0,
    "referringDomains" INTEGER NOT NULL DEFAULT 0,
    "referringIPs" INTEGER NOT NULL DEFAULT 0,
    "spamScore" INTEGER NOT NULL DEFAULT 0,
    "brokenBacklinks" INTEGER NOT NULL DEFAULT 0,
    "newBacklinks14d" INTEGER NOT NULL DEFAULT 0,
    "lostBacklinks14d" INTEGER NOT NULL DEFAULT 0,
    "newReferringDomains14d" INTEGER NOT NULL DEFAULT 0,
    "lostReferringDomains14d" INTEGER NOT NULL DEFAULT 0,
    "domainRank" INTEGER NOT NULL DEFAULT 0,
    "oprScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "topBacklinks" TEXT NOT NULL,
    "topReferringDomains" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BacklinkDomainAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BacklinkProject" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "niche" TEXT NOT NULL,
    "targetKeywords" TEXT NOT NULL,
    "contentBrief" TEXT NOT NULL,
    "totalOpportunities" INTEGER NOT NULL DEFAULT 0,
    "contactedCount" INTEGER NOT NULL DEFAULT 0,
    "securedCount" INTEGER NOT NULL DEFAULT 0,
    "aiSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BacklinkProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BacklinkOpportunity" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "siteName" TEXT NOT NULL,
    "siteUrl" TEXT NOT NULL,
    "domainAuthority" TEXT NOT NULL,
    "linkType" TEXT NOT NULL,
    "angle" TEXT NOT NULL,
    "whyRelevant" TEXT NOT NULL,
    "contactApproach" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "impact" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'prospecting',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BacklinkOpportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeoAudit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "pageTitle" TEXT,
    "overallScore" INTEGER NOT NULL,
    "totalChecks" INTEGER NOT NULL,
    "passedChecks" INTEGER NOT NULL,
    "failedChecks" INTEGER NOT NULL,
    "warnChecks" INTEGER NOT NULL,
    "categoryScores" TEXT NOT NULL,
    "autoResults" TEXT NOT NULL,
    "aiResults" TEXT NOT NULL,
    "checklistState" TEXT NOT NULL,
    "backlinkData" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeoAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocalSEOTask" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "locationId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LocalSEOTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_clerkId_key" ON "User"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_clerkId_idx" ON "User"("clerkId");

-- CreateIndex
CREATE INDEX "Client_agencyId_idx" ON "Client"("agencyId");

-- CreateIndex
CREATE INDEX "ClientReport_clientId_idx" ON "ClientReport"("clientId");

-- CreateIndex
CREATE INDEX "ClientReport_month_idx" ON "ClientReport"("month");

-- CreateIndex
CREATE INDEX "ReportTemplate_agencyId_idx" ON "ReportTemplate"("agencyId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_dodoSubscriptionId_key" ON "Subscription"("dodoSubscriptionId");

-- CreateIndex
CREATE INDEX "Subscription_dodoSubscriptionId_idx" ON "Subscription"("dodoSubscriptionId");

-- CreateIndex
CREATE INDEX "Subscription_userId_idx" ON "Subscription"("userId");

-- CreateIndex
CREATE INDEX "Usage_userId_month_idx" ON "Usage"("userId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "Usage_userId_month_key" ON "Usage"("userId", "month");

-- CreateIndex
CREATE INDEX "PerformanceFixerAudit_userId_idx" ON "PerformanceFixerAudit"("userId");

-- CreateIndex
CREATE INDEX "AIFixGeneration_auditId_idx" ON "AIFixGeneration"("auditId");

-- CreateIndex
CREATE INDEX "ContentOptimization_userId_idx" ON "ContentOptimization"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BlogPost_slug_key" ON "BlogPost"("slug");

-- CreateIndex
CREATE INDEX "BlogPost_slug_idx" ON "BlogPost"("slug");

-- CreateIndex
CREATE INDEX "BlogPost_published_publishedAt_idx" ON "BlogPost"("published", "publishedAt");

-- CreateIndex
CREATE INDEX "ContentOptimizationFix_optimizationId_idx" ON "ContentOptimizationFix"("optimizationId");

-- CreateIndex
CREATE INDEX "ContentIdeaProject_userId_idx" ON "ContentIdeaProject"("userId");

-- CreateIndex
CREATE INDEX "ContentIdea_projectId_idx" ON "ContentIdea"("projectId");

-- CreateIndex
CREATE INDEX "ContentIdea_difficulty_idx" ON "ContentIdea"("difficulty");

-- CreateIndex
CREATE INDEX "ContentIdea_opportunityScore_idx" ON "ContentIdea"("opportunityScore");

-- CreateIndex
CREATE INDEX "CompetitorAnalysis_userId_idx" ON "CompetitorAnalysis"("userId");

-- CreateIndex
CREATE INDEX "CompetitorAnalysis_domainUrl_idx" ON "CompetitorAnalysis"("domainUrl");

-- CreateIndex
CREATE INDEX "CompetitorComparison_userId_idx" ON "CompetitorComparison"("userId");

-- CreateIndex
CREATE INDEX "OnPageAnalysis_userId_idx" ON "OnPageAnalysis"("userId");

-- CreateIndex
CREATE INDEX "OnPageAnalysis_targetKeyword_idx" ON "OnPageAnalysis"("targetKeyword");

-- CreateIndex
CREATE INDEX "ContentCalendar_projectId_idx" ON "ContentCalendar"("projectId");

-- CreateIndex
CREATE INDEX "ContentCalendar_publishDate_idx" ON "ContentCalendar"("publishDate");

-- CreateIndex
CREATE INDEX "RankTrackingProject_userId_idx" ON "RankTrackingProject"("userId");

-- CreateIndex
CREATE INDEX "RankTrackingProject_domain_idx" ON "RankTrackingProject"("domain");

-- CreateIndex
CREATE INDEX "RankTrackingKeyword_projectId_idx" ON "RankTrackingKeyword"("projectId");

-- CreateIndex
CREATE INDEX "RankTrackingKeyword_currentRank_idx" ON "RankTrackingKeyword"("currentRank");

-- CreateIndex
CREATE UNIQUE INDEX "RankTrackingKeyword_projectId_keyword_key" ON "RankTrackingKeyword"("projectId", "keyword");

-- CreateIndex
CREATE INDEX "RankHistory_projectId_idx" ON "RankHistory"("projectId");

-- CreateIndex
CREATE INDEX "RankHistory_keywordId_idx" ON "RankHistory"("keywordId");

-- CreateIndex
CREATE INDEX "RankHistory_checkedDate_idx" ON "RankHistory"("checkedDate");

-- CreateIndex
CREATE UNIQUE INDEX "RankHistory_keywordId_checkedDate_key" ON "RankHistory"("keywordId", "checkedDate");

-- CreateIndex
CREATE INDEX "RankAlert_projectId_idx" ON "RankAlert"("projectId");

-- CreateIndex
CREATE INDEX "RankAlert_read_idx" ON "RankAlert"("read");

-- CreateIndex
CREATE INDEX "LocalSEOAccount_userId_idx" ON "LocalSEOAccount"("userId");

-- CreateIndex
CREATE INDEX "LocalSEOLocation_accountId_idx" ON "LocalSEOLocation"("accountId");

-- CreateIndex
CREATE INDEX "LocalSEOLocation_city_idx" ON "LocalSEOLocation"("city");

-- CreateIndex
CREATE UNIQUE INDEX "LocalSEOLocation_accountId_gbpId_key" ON "LocalSEOLocation"("accountId", "gbpId");

-- CreateIndex
CREATE INDEX "LocalKeywordRank_locationId_idx" ON "LocalKeywordRank"("locationId");

-- CreateIndex
CREATE INDEX "LocalKeywordRank_currentRank_idx" ON "LocalKeywordRank"("currentRank");

-- CreateIndex
CREATE UNIQUE INDEX "LocalKeywordRank_locationId_keyword_searchType_key" ON "LocalKeywordRank"("locationId", "keyword", "searchType");

-- CreateIndex
CREATE INDEX "LocalRankHistory_keywordId_idx" ON "LocalRankHistory"("keywordId");

-- CreateIndex
CREATE INDEX "LocalRankHistory_checkedDate_idx" ON "LocalRankHistory"("checkedDate");

-- CreateIndex
CREATE UNIQUE INDEX "LocalRankHistory_keywordId_checkedDate_key" ON "LocalRankHistory"("keywordId", "checkedDate");

-- CreateIndex
CREATE INDEX "LocalReview_accountId_idx" ON "LocalReview"("accountId");

-- CreateIndex
CREATE INDEX "LocalReview_locationId_idx" ON "LocalReview"("locationId");

-- CreateIndex
CREATE INDEX "LocalReview_rating_idx" ON "LocalReview"("rating");

-- CreateIndex
CREATE INDEX "LocalCitation_accountId_idx" ON "LocalCitation"("accountId");

-- CreateIndex
CREATE INDEX "LocalCitation_locationId_idx" ON "LocalCitation"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "LocalCitation_accountId_locationId_source_key" ON "LocalCitation"("accountId", "locationId", "source");

-- CreateIndex
CREATE INDEX "LLMVisibilityAnalysis_userId_idx" ON "LLMVisibilityAnalysis"("userId");

-- CreateIndex
CREATE INDEX "LLMVisibilityAnalysis_llmVisibilityScore_idx" ON "LLMVisibilityAnalysis"("llmVisibilityScore");

-- CreateIndex
CREATE INDEX "LLMVisibilityPage_analysisId_idx" ON "LLMVisibilityPage"("analysisId");

-- CreateIndex
CREATE INDEX "LLMVisibilityPage_pageScore_idx" ON "LLMVisibilityPage"("pageScore");

-- CreateIndex
CREATE INDEX "LLMQueryTest_analysisId_idx" ON "LLMQueryTest"("analysisId");

-- CreateIndex
CREATE INDEX "LLMQueryTest_retrievalScore_idx" ON "LLMQueryTest"("retrievalScore");

-- CreateIndex
CREATE INDEX "BacklinkDomainAnalysis_userId_idx" ON "BacklinkDomainAnalysis"("userId");

-- CreateIndex
CREATE INDEX "BacklinkDomainAnalysis_domain_idx" ON "BacklinkDomainAnalysis"("domain");

-- CreateIndex
CREATE INDEX "BacklinkProject_userId_idx" ON "BacklinkProject"("userId");

-- CreateIndex
CREATE INDEX "BacklinkOpportunity_projectId_idx" ON "BacklinkOpportunity"("projectId");

-- CreateIndex
CREATE INDEX "BacklinkOpportunity_status_idx" ON "BacklinkOpportunity"("status");

-- CreateIndex
CREATE INDEX "SeoAudit_userId_idx" ON "SeoAudit"("userId");

-- CreateIndex
CREATE INDEX "LocalSEOTask_accountId_idx" ON "LocalSEOTask"("accountId");

-- CreateIndex
CREATE INDEX "LocalSEOTask_status_idx" ON "LocalSEOTask"("status");

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientReport" ADD CONSTRAINT "ClientReport_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportTemplate" ADD CONSTRAINT "ReportTemplate_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Usage" ADD CONSTRAINT "Usage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceFixerAudit" ADD CONSTRAINT "PerformanceFixerAudit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIFixGeneration" ADD CONSTRAINT "AIFixGeneration_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "PerformanceFixerAudit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentOptimization" ADD CONSTRAINT "ContentOptimization_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentOptimizationFix" ADD CONSTRAINT "ContentOptimizationFix_optimizationId_fkey" FOREIGN KEY ("optimizationId") REFERENCES "ContentOptimization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentIdeaProject" ADD CONSTRAINT "ContentIdeaProject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentIdea" ADD CONSTRAINT "ContentIdea_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ContentIdeaProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitorAnalysis" ADD CONSTRAINT "CompetitorAnalysis_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitorComparison" ADD CONSTRAINT "CompetitorComparison_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnPageAnalysis" ADD CONSTRAINT "OnPageAnalysis_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentCalendar" ADD CONSTRAINT "ContentCalendar_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ContentIdeaProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RankTrackingProject" ADD CONSTRAINT "RankTrackingProject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RankTrackingKeyword" ADD CONSTRAINT "RankTrackingKeyword_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "RankTrackingProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RankHistory" ADD CONSTRAINT "RankHistory_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "RankTrackingProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RankHistory" ADD CONSTRAINT "RankHistory_keywordId_fkey" FOREIGN KEY ("keywordId") REFERENCES "RankTrackingKeyword"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RankAlert" ADD CONSTRAINT "RankAlert_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "RankTrackingProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocalSEOAccount" ADD CONSTRAINT "LocalSEOAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocalSEOLocation" ADD CONSTRAINT "LocalSEOLocation_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "LocalSEOAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocalKeywordRank" ADD CONSTRAINT "LocalKeywordRank_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "LocalSEOLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocalRankHistory" ADD CONSTRAINT "LocalRankHistory_keywordId_fkey" FOREIGN KEY ("keywordId") REFERENCES "LocalKeywordRank"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocalReview" ADD CONSTRAINT "LocalReview_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "LocalSEOAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocalReview" ADD CONSTRAINT "LocalReview_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "LocalSEOLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocalCitation" ADD CONSTRAINT "LocalCitation_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "LocalSEOAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocalCitation" ADD CONSTRAINT "LocalCitation_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "LocalSEOLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LLMVisibilityAnalysis" ADD CONSTRAINT "LLMVisibilityAnalysis_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LLMVisibilityPage" ADD CONSTRAINT "LLMVisibilityPage_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "LLMVisibilityAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LLMQueryTest" ADD CONSTRAINT "LLMQueryTest_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "LLMVisibilityAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BacklinkDomainAnalysis" ADD CONSTRAINT "BacklinkDomainAnalysis_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BacklinkProject" ADD CONSTRAINT "BacklinkProject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BacklinkOpportunity" ADD CONSTRAINT "BacklinkOpportunity_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "BacklinkProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeoAudit" ADD CONSTRAINT "SeoAudit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocalSEOTask" ADD CONSTRAINT "LocalSEOTask_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "LocalSEOAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

