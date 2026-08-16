-- Generalise HealthRun into CronRun.
--
-- HealthRun (migration 0017, earlier the same day) recorded executions of the health cron
-- so that a check which had silently stopped firing could be told apart from one reporting
-- all-clear. The other four scheduled jobs — drip, weekly, trial-reminder, gsc-sync — have
-- exactly the same problem and exactly the same shape, so this is one table with a job
-- column rather than two tables doing the same thing.
--
-- HealthRun is dropped rather than migrated: it was created hours ago and the health cron
-- has not run since, so it holds no rows. Verified before writing this.
--
-- Written by hand and applied with `prisma migrate deploy`: `migrate dev` cannot run
-- here because migration 0003 enables RLS on _prisma_migrations, which blocks the
-- shadow database's non-owner role from tracking its own migrations.

DROP TABLE IF EXISTS "HealthRun";

CREATE TABLE "CronRun" (
    "id" TEXT NOT NULL,
    "job" TEXT NOT NULL,
    "ranAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ok" BOOLEAN NOT NULL,
    "ms" INTEGER NOT NULL,
    "detail" JSONB NOT NULL,

    CONSTRAINT "CronRun_pkey" PRIMARY KEY ("id")
);

-- "latest run of job X" is the read behind every dashboard row.
CREATE INDEX "CronRun_job_ranAt_idx" ON "CronRun"("job", "ranAt");
-- Retention pruning sweeps across all jobs by date.
CREATE INDEX "CronRun_ranAt_idx" ON "CronRun"("ranAt");

-- RLS is enabled on every table in this database (migration 0003). Access is via
-- Prisma using the service role, which bypasses RLS; enabling it here keeps the table
-- consistent with the rest rather than leaving one table open.
ALTER TABLE "CronRun" ENABLE ROW LEVEL SECURITY;
