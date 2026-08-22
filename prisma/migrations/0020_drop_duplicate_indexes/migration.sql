-- Drop twelve redundant indexes, and one constraint named after a payment processor we
-- stopped using.
--
-- Found by the Supabase database linter's duplicate_index rule (2026-08-22), alongside the
-- RLS finding in 0019. Three separate causes:
--
-- 1. `@@index` declared next to `@unique` in schema.prisma. Prisma builds a unique index
--    for the constraint and a plain one for the @@index, on identical columns; the unique
--    one already serves every lookup the plain one would. The @@index lines are removed
--    from schema.prisma in the same commit, or `migrate` would simply recreate these.
--
-- 2. Hand-written idx_* indexes from before those models were managed by Prisma, each
--    duplicating the Prisma-generated index beside it. These were never in schema.prisma,
--    so dropping them cannot drift.
--
-- 3. Subscription_paddleSubscriptionId_key: a UNIQUE CONSTRAINT on `dodoSubscriptionId`.
--    The column was renamed during the Paddle -> DoDo migration and the constraint name
--    was not, so the table has carried a constraint named for the wrong provider ever
--    since. There is no `paddle` left anywhere in the schema or the code. Uniqueness on
--    that column is unaffected: Subscription_dodoSubscriptionId_key is a separate unique
--    index and stays.
--
-- Every index here is 16 kB, so this is not a performance fix - it is removing things that
-- mislead whoever reads this schema next.

-- 1. Plain indexes duplicating a unique index on the same columns.
DROP INDEX IF EXISTS "BlogPost_slug_idx";
DROP INDEX IF EXISTS "DailyToolUsage_userId_tool_day_idx";
DROP INDEX IF EXISTS "SearchConsoleConnection_userId_idx";
DROP INDEX IF EXISTS "Subscription_dodoSubscriptionId_idx";
DROP INDEX IF EXISTS "Subscription_userId_idx";
DROP INDEX IF EXISTS "Usage_userId_month_idx";
DROP INDEX IF EXISTS "User_clerkId_idx";

-- 2. Pre-Prisma hand-written indexes, each duplicating its Prisma counterpart.
DROP INDEX IF EXISTS idx_user_clerkid;
DROP INDEX IF EXISTS idx_subscription_userid;
DROP INDEX IF EXISTS idx_perf_userid;
DROP INDEX IF EXISTS idx_contentopt_userid;

-- 3. The Paddle-era constraint. ALTER TABLE, not DROP INDEX: it is constraint-backed.
ALTER TABLE "Subscription" DROP CONSTRAINT IF EXISTS "Subscription_paddleSubscriptionId_key";
