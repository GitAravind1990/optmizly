-- Drops the Opportunity Ratio column. The metric divided a Google title-match count
-- by search volume, but its numerator (se_results_count from the organic SERP endpoint)
-- does not respect the intitle:/allintitle: operators, so the stored values were noise.
-- Competition is now read from the calibrated keyword_difficulty already in "difficulty".
ALTER TABLE "KeywordResearchResult" DROP COLUMN "opportunityRatio";
