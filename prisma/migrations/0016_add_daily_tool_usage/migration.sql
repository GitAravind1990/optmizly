-- Per-day, per-tool usage counters for tools capped daily rather than monthly.
-- Written by hand and applied with `prisma migrate deploy`: `migrate dev` cannot run
-- here because migration 0003 enables RLS on _prisma_migrations, which blocks the
-- shadow database's non-owner role from tracking its own migrations.

CREATE TABLE "DailyToolUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tool" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyToolUsage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DailyToolUsage_userId_tool_day_key" ON "DailyToolUsage"("userId", "tool", "day");
CREATE INDEX "DailyToolUsage_userId_tool_day_idx" ON "DailyToolUsage"("userId", "tool", "day");

ALTER TABLE "DailyToolUsage" ADD CONSTRAINT "DailyToolUsage_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS is enabled on every table in this database (migration 0003). Access is via
-- Prisma using the service role, which bypasses RLS; enabling it here keeps the table
-- consistent with the rest rather than leaving one table open.
ALTER TABLE "DailyToolUsage" ENABLE ROW LEVEL SECURITY;
