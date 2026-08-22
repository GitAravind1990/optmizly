-- Drop seven RLS policies written against Supabase Auth, which this product does not use.
--
-- Each compares `auth.uid()::text` to a Clerk id, directly or through a join:
--
--     (auth.uid())::text = "clerkId"
--
-- auth.uid() reads the `sub` claim of a Supabase Auth JWT. Authentication here is Clerk, so
-- there is no such JWT and auth.uid() is null for every PostgREST request. The comparison
-- never matches, so these policies already deny everything - which is exactly what the
-- other 38 tables get from having RLS enabled and no policies at all. Dropping them is
-- strictly more restrictive, never less.
--
-- They do not affect the application either way: Prisma connects as `postgres`, which has
-- rolbypassrls.
--
-- Supabase's linter flags them under auth_rls_initplan, for re-evaluating auth.uid() once
-- per row instead of once per query. That cost is theoretical here since the policies never
-- run, and `(select auth.uid())` would only make a policy that matches nothing faster. The
-- reason to remove them is that they describe an auth model this product does not have -
-- anyone reading this schema would reasonably conclude Supabase Auth is wired up.
--
-- After this, all 45 public tables are consistent: RLS enabled, no policies, closed to
-- PostgREST, open to the application through a role that bypasses RLS.

DROP POLICY IF EXISTS "Users can view own fixes" ON "AIFixGeneration";
DROP POLICY IF EXISTS "Users can view own analyses" ON "ContentOptimization";
DROP POLICY IF EXISTS "Users can view own optimization fixes" ON "ContentOptimizationFix";
DROP POLICY IF EXISTS "Users can view own performance audits" ON "PerformanceFixerAudit";
DROP POLICY IF EXISTS "Users can view own subscription" ON "Subscription";
DROP POLICY IF EXISTS "Users can view own usage" ON "Usage";
DROP POLICY IF EXISTS "Users can view own data" ON "User";
