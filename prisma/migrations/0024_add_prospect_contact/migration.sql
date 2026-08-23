-- Prospect contact tracking, keyed by Google's placeId rather than by a search.
--
-- That key is the feature: two searches over the same city return overlapping businesses,
-- and the second one has to remember the first was already emailed. A status held inside a
-- search's prospects blob could not do that, and would vanish when the 50-search retention
-- pruned the row.
--
-- "Not contacted" is the absence of a row, not a stored value, so this table only ever holds
-- prospects an agency has actually worked.
--
-- Written by hand and applied with `prisma migrate deploy` - `migrate dev` cannot run here
-- because migration 0003 enables RLS on _prisma_migrations, which blocks the shadow
-- database's non-owner role from tracking its own migrations.

CREATE TABLE "ProspectContact" (
    "id"           TEXT NOT NULL,
    "userId"       TEXT NOT NULL,
    "placeId"      TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "status"       TEXT NOT NULL,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProspectContact_pkey" PRIMARY KEY ("id")
);

-- One row per business per user; the upsert depends on this.
CREATE UNIQUE INDEX "ProspectContact_userId_placeId_key" ON "ProspectContact"("userId", "placeId");
CREATE INDEX "ProspectContact_userId_updatedAt_idx" ON "ProspectContact"("userId", "updatedAt");

ALTER TABLE "ProspectContact" ADD CONSTRAINT "ProspectContact_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Required for every new table here - see CLAUDE.md, "Adding a table".
ALTER TABLE "ProspectContact" ENABLE ROW LEVEL SECURITY;
