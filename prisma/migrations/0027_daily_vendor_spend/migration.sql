-- A system-wide daily ceiling on billed third-party requests, starting with Google Places.
--
-- Per-user caps cannot bound aggregate spend: fifteen searches a day is a fine limit for
-- one Agency account and a large bill across a thousand free ones. This table is the
-- aggregate counter that the per-user caps sit inside.

CREATE TABLE "DailyVendorSpend" (
    "id"        TEXT NOT NULL,
    "vendor"    TEXT NOT NULL,
    "day"       TEXT NOT NULL,
    "units"     INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyVendorSpend_pkey" PRIMARY KEY ("id")
);

-- The upsert target. Also what makes the counter reset without a scheduled job.
CREATE UNIQUE INDEX "DailyVendorSpend_vendor_day_key" ON "DailyVendorSpend"("vendor", "day");

-- For pruning and for reading a spend history.
CREATE INDEX "DailyVendorSpend_day_idx" ON "DailyVendorSpend"("day");

-- Required on every table in this database. Supabase exposes the public schema through
-- PostgREST, so a table without RLS is readable by anyone holding the anon key, which is a
-- public credential by design. Prisma connects as postgres (rolbypassrls), so RLS with no
-- policies denies PostgREST and leaves the application completely unaffected.
ALTER TABLE "DailyVendorSpend" ENABLE ROW LEVEL SECURITY;
