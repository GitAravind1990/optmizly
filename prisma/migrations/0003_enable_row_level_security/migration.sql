-- Enable Row Level Security on every public-schema table, with no policies.
--
-- Why: Supabase's PostgREST layer auto-exposes every table in the `public` schema
-- via a REST API by default, independent of whether the app code uses it. This
-- app only ever accesses Postgres through Prisma's direct connection (DATABASE_URL)
-- and never uses Supabase's client SDK or PostgREST -- so leaving RLS disabled left
-- every table reachable by anyone who ever obtained the project's Supabase anon key
-- by any means (dashboard access, a future copy-paste mistake, a screenshot),
-- completely bypassing the app's own Clerk-based auth.
--
-- Why no policies: Prisma's connection uses the table-owner role, which Postgres
-- exempts from RLS by default regardless of policy count. Enabling RLS with zero
-- policies blocks the unused PostgREST path entirely while leaving Prisma's own
-- reads/writes completely unaffected -- verified live post-deploy with a real
-- authenticated read and write, both unchanged.
ALTER TABLE public."AIFixGeneration" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AnalysisHistory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."BacklinkDomainAnalysis" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."BacklinkOpportunity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."BacklinkProject" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."BlogPost" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."BlogSubscriber" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Client" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ClientReport" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."CompetitorAnalysis" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."CompetitorComparison" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ContentCalendar" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ContentIdea" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ContentIdeaProject" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ContentOptimization" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ContentOptimizationFix" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."DrippedEmail" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."LLMQueryTest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."LLMVisibilityAnalysis" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."LLMVisibilityPage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."LocalCitation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."LocalKeywordRank" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."LocalRankHistory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."LocalReview" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."LocalSEOAccount" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."LocalSEOLocation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."LocalSEOTask" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."OnPageAnalysis" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PerformanceFixerAudit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."RankAlert" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."RankHistory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."RankTrackingKeyword" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."RankTrackingProject" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ReportTemplate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SearchConsoleConnection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SeoAudit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Subscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Usage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."_prisma_migrations" ENABLE ROW LEVEL SECURITY;
