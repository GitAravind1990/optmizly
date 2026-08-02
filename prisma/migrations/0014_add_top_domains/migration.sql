-- Stores the top-3 ranking domains for Magic Keyword candidates, fetched on demand.
-- Keyword Difficulty is computed from the backlink profile of the ranking pages, so it
-- is blind to domain authority (a lightly-linked page on nike.com scores KD 0). Showing
-- who actually ranks lets that be judged directly instead of trusting a single number.
-- Comma-separated to match the scalar-only style of this table; NULL = not yet checked.
ALTER TABLE "KeywordResearchResult" ADD COLUMN "topDomains" TEXT;
