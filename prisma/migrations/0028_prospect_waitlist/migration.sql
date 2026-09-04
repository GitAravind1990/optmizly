-- Turns the daily Places ceiling from an outage into a lead capture.
--
-- When the system-wide ceiling is spent, the search cannot run. Returning an error wastes
-- the visitor; taking their email and telling them when capacity returns keeps them.

CREATE TABLE "ProspectWaitlist" (
    "id"         TEXT NOT NULL,
    "email"      TEXT NOT NULL,
    "industry"   TEXT NOT NULL,
    "location"   TEXT NOT NULL,
    -- Null for anonymous visitors, which is the public prospect finder's case.
    "userId"     TEXT,
    "source"     TEXT NOT NULL DEFAULT 'dashboard',
    -- Null means still waiting. The notifier selects on this, so a failed send is retried
    -- on the next run rather than silently dropped.
    "notifiedAt" TIMESTAMP(3),
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProspectWaitlist_pkey" PRIMARY KEY ("id")
);

-- SET NULL rather than CASCADE: a deleted account should not erase the record that
-- capacity was short, and the email stands on its own.
ALTER TABLE "ProspectWaitlist"
    ADD CONSTRAINT "ProspectWaitlist_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "ProspectWaitlist_email_industry_location_createdAt_key"
    ON "ProspectWaitlist"("email", "industry", "location", "createdAt");
CREATE INDEX "ProspectWaitlist_notifiedAt_idx" ON "ProspectWaitlist"("notifiedAt");
CREATE INDEX "ProspectWaitlist_userId_idx" ON "ProspectWaitlist"("userId");

-- Required on every table here: Supabase exposes the public schema through PostgREST, so a
-- table without RLS is readable by anyone holding the anon key. This one holds email
-- addresses, so it is exactly the shape that must not be public.
ALTER TABLE "ProspectWaitlist" ENABLE ROW LEVEL SECURITY;
