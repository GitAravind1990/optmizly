-- A durable record of each /api/cron/health execution.
--
-- Until now a healthy run left no trace anywhere: alerts are failure-only, this plan
-- retains no runtime logs, and nothing was written to the database. That made a check
-- that had silently stopped firing look exactly like a check reporting all-clear.
--
-- Written by hand and applied with `prisma migrate deploy`: `migrate dev` cannot run
-- here because migration 0003 enables RLS on _prisma_migrations, which blocks the
-- shadow database's non-owner role from tracking its own migrations.

CREATE TABLE "HealthRun" (
    "id" TEXT NOT NULL,
    "ranAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "healthy" BOOLEAN NOT NULL,
    "ms" INTEGER NOT NULL,
    "checks" JSONB NOT NULL,

    CONSTRAINT "HealthRun_pkey" PRIMARY KEY ("id")
);

-- Every read is "most recent run" or "runs since date"; both are served by this.
CREATE INDEX "HealthRun_ranAt_idx" ON "HealthRun"("ranAt");

-- RLS is enabled on every table in this database (migration 0003). Access is via
-- Prisma using the service role, which bypasses RLS; enabling it here keeps the table
-- consistent with the rest rather than leaving one table open.
ALTER TABLE "HealthRun" ENABLE ROW LEVEL SECURITY;
