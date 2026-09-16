-- Granted plans: an account holding a plan it did not pay for, at an allowance that is not
-- the plan's own.
--
-- This already existed as PINNED_ACCOUNTS, a constant in src/lib/auth.ts. A constant is a good
-- place for the founder account -- it cannot be deleted by accident and it needs no database to
-- be true -- and a bad place for beta testers, because granting access then requires an edit, a
-- commit and a deploy. A deploy is not free here: it re-registers the crons and can cost a run
-- that had not fired yet, so "add a tester" should not be a reason to ship.
--
-- The constant stays and still wins. This table is for grants that come and go.

CREATE TABLE "PinnedGrant" (
    "id"    TEXT NOT NULL,
    -- Lowercased before write. Clerk preserves whatever case was typed at sign-up, and a
    -- grant that misses because someone wrote Name@Example.com lands them on FREE with
    -- nothing explaining why.
    "email" TEXT NOT NULL,
    "plan"  "Plan" NOT NULL,

    -- The allowance, when it should not be the one the plan sells. Null means "the plan's
    -- own number", which is what a full grant wants. This is what makes "all the tools, not
    -- all the spend" expressible: Agency's whole surface on ten credits a month.
    "monthlyLimit" INTEGER,

    -- Why this person has access. Free text, shown in the admin list. A grant with no reason
    -- recorded becomes a row nobody dares revoke.
    "note"      TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PinnedGrant_pkey" PRIMARY KEY ("id")
);

-- One grant per address. Two rows for the same person would make access depend on row order.
CREATE UNIQUE INDEX "PinnedGrant_email_key" ON "PinnedGrant"("email");
CREATE INDEX "PinnedGrant_createdAt_idx" ON "PinnedGrant"("createdAt");

-- The allowance actually enforced for this account, and the marker saying it was granted.
--
-- Persisted onto the row rather than read live from the grant on every check, for the same
-- reason the pinned plan already is: admin views, exports and the quota check must agree, and
-- they agree by reading one row. It also keeps monthlyLimitFor synchronous, which matters --
-- it is called from requireAuth, assertQuotaAvailable, getUserUsage and the weekly cron, and
-- an allowance that four callers compute differently is the bug this function exists to stop.
ALTER TABLE "User" ADD COLUMN "monthlyLimit" INTEGER;

-- Set when a grant is applied, cleared when it is revoked.
--
-- Without it revocation is unimplementable. A granted account has its plan written to the row,
-- and hasLapsed only downgrades accounts carrying a CANCELLED or EXPIRED subscription -- a
-- grant-only user has no subscription at all, so nothing would ever take the plan back. Worse,
-- the cap would widen rather than close: with the grant gone the limit falls back to the
-- plan's own, so revoking a 10-credit Agency tester would have handed them Agency's 200.
ALTER TABLE "User" ADD COLUMN "grantedAt" TIMESTAMP(3);

-- Required on every table here. This one lists who was given paid access for free, with the
-- address it was given to -- a PostgREST read through the public anon key would expose the lot.
ALTER TABLE "PinnedGrant" ENABLE ROW LEVEL SECURITY;
