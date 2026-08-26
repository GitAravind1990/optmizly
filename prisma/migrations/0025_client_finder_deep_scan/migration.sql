-- Deep scan: a search now analyses its pool across several requests rather than one.
-- The pool is stored so a scan can resume without re-paying Places for discovery.
ALTER TABLE "ClientFinderSearch" ADD COLUMN "pool" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "ClientFinderSearch" ADD COLUMN "cursor" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ClientFinderSearch" ADD COLUMN "examined" INTEGER NOT NULL DEFAULT 0;

-- No ENABLE ROW LEVEL SECURITY here: this alters an existing table, and RLS was enabled on
-- ClientFinderSearch when it was created in 0022. New tables still need their own line.
