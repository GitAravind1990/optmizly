-- Stored Search Console Search Analytics rows: Google's own measured impressions,
-- clicks and average position for queries a connected property actually ranks for.
-- This is the only ground truth available without a clickstream panel, and Google
-- drops history beyond ~16 months, so it is stored rather than read through.
--
-- Uniqueness is on a SHA-256 of the dimension tuple rather than the raw dimensions:
-- Postgres btree index tuples cap around 2.7KB and a query+page pair can exceed it.
CREATE TABLE "GscQueryRow" (
    "id"          TEXT NOT NULL,
    "userId"      TEXT NOT NULL,
    "siteUrl"     TEXT NOT NULL,
    "date"        DATE NOT NULL,
    "query"       TEXT NOT NULL,
    "page"        TEXT,
    "country"     TEXT NOT NULL,
    "device"      TEXT NOT NULL,
    "clicks"      INTEGER NOT NULL,
    "impressions" INTEGER NOT NULL,
    "ctr"         DOUBLE PRECISION NOT NULL,
    "position"    DOUBLE PRECISION NOT NULL,
    "fetchedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dimHash"     TEXT NOT NULL,

    CONSTRAINT "GscQueryRow_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GscQueryRow_userId_dimHash_key" ON "GscQueryRow"("userId", "dimHash");
CREATE INDEX "GscQueryRow_userId_siteUrl_idx" ON "GscQueryRow"("userId", "siteUrl");
CREATE INDEX "GscQueryRow_userId_date_idx" ON "GscQueryRow"("userId", "date");

ALTER TABLE "GscQueryRow" ADD CONSTRAINT "GscQueryRow_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
