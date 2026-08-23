-- Saved SEO Client Finder searches, so prospects can be revisited without re-running the
-- discovery (which costs a paid Places request and up to ten homepage fetches).
--
-- Prospects are one JSON blob rather than normalised prospect and finding tables. Nothing
-- queries across prospects, the results are a snapshot of a moment rather than living
-- records, and a schema for them would commit to a shape this tool is still changing.
-- Roughly 20-30KB per search. Normalise when something needs to ask a question across them.
--
-- Written by hand and applied with `prisma migrate deploy` - `migrate dev` cannot run here
-- because migration 0003 enables RLS on _prisma_migrations, which blocks the shadow
-- database's non-owner role from tracking its own migrations.

CREATE TABLE "ClientFinderSearch" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "industry"  TEXT NOT NULL,
    "location"  TEXT NOT NULL,
    "service"   TEXT,
    "prospects" TEXT NOT NULL,
    "found"     INTEGER NOT NULL,
    "analyzed"  INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientFinderSearch_pkey" PRIMARY KEY ("id")
);

-- Every read is "this user's searches, newest first".
CREATE INDEX "ClientFinderSearch_userId_createdAt_idx" ON "ClientFinderSearch"("userId", "createdAt");

ALTER TABLE "ClientFinderSearch" ADD CONSTRAINT "ClientFinderSearch_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Required for every new table in this database - see CLAUDE.md, "Adding a table". Without
-- it the table is readable through PostgREST by anyone holding the project's anon key,
-- which is how GscQueryRow sat exposed for two weeks. No policies, matching the other 45:
-- Prisma connects as `postgres`, which has rolbypassrls.
ALTER TABLE "ClientFinderSearch" ENABLE ROW LEVEL SECURITY;
