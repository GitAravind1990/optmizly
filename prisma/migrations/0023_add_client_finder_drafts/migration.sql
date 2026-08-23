-- Outreach drafts, stored on the search they belong to.
--
-- A column rather than a table: a draft has no meaning apart from the prospect it was
-- written for, and that prospect only exists inside this row's `prospects` blob. A separate
-- table would need a foreign key to a prospect that is not a row anywhere.
--
-- Defaults to '{}' so the rows written before this column existed read as "no drafts"
-- instead of forcing a null check at every use.
--
-- Written by hand and applied with `prisma migrate deploy` - `migrate dev` cannot run here
-- because migration 0003 enables RLS on _prisma_migrations, which blocks the shadow
-- database's non-owner role from tracking its own migrations.
--
-- No RLS statement needed: ClientFinderSearch already has it from 0022, and altering a
-- table does not change that.

ALTER TABLE "ClientFinderSearch" ADD COLUMN "drafts" TEXT NOT NULL DEFAULT '{}';
