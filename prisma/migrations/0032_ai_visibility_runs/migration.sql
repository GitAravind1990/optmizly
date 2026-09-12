-- AI visibility runs: one row per report, with the per-prompt detail stored as JSON.
--
-- Two tables would be the textbook shape, but the detail is only ever read as a whole with its
-- run and never queried across runs, so a child table would buy joins and a migration for no
-- query it serves. The totals that ARE queried across runs -- to draw a trend -- are columns.
--
-- Storing runs is what turns a snapshot into a trend, which is the part of this that has
-- commercial value: Ahrefs charges $199/mo for historical AI visibility and the difference
-- between their free checker and that tier is, structurally, a timestamp column.
CREATE TABLE "AiVisibilityRun" (
    "id"     TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    -- What was searched for. Kept verbatim so a trend compares like with like: a run for
    -- "Optmizly" and one for "optmizly.com" are not the same measurement.
    "brand"   TEXT NOT NULL,
    "domain"  TEXT,
    "aliases" TEXT NOT NULL DEFAULT '[]',

    -- Where the prompts came from, because it changes how much the number means. A run
    -- grounded in real Search Console queries is evidence; one built from keyword suggestions
    -- is a reasonable proxy, and the report has to be able to say which it was.
    "promptSource" TEXT NOT NULL,
    "promptCount"  INTEGER NOT NULL,

    -- Trend columns. Queried across runs, so not buried in the JSON.
    "totalMentions"  INTEGER NOT NULL,
    "totalCitations" INTEGER NOT NULL,
    "answersFound"   INTEGER NOT NULL,
    "lookupsFailed"  INTEGER NOT NULL DEFAULT 0,

    -- Per-prompt outcomes and the cited-domain tally, as returned to the client.
    "detail" TEXT NOT NULL,

    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiVisibilityRun_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "AiVisibilityRun"
    ADD CONSTRAINT "AiVisibilityRun_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- The only access pattern: this customer's runs, newest first, for the list and the trend.
CREATE INDEX "AiVisibilityRun_userId_createdAt_idx" ON "AiVisibilityRun"("userId", "createdAt");

-- Supabase exposes the public schema through PostgREST, so a table without RLS is readable by
-- anyone holding the project's anon key -- which is a public credential by design. Prisma
-- connects as postgres, which has rolbypassrls, so RLS with no policies denies PostgREST and
-- leaves the application completely unaffected. Migration 0015 forgot this and left every
-- user's Search Console data exposed for two weeks.
ALTER TABLE "AiVisibilityRun" ENABLE ROW LEVEL SECURITY;
