-- Widen backlinksTotal/dofollowLinks/nofollowLinks from INT4 to INT8 (BigInt).
-- A real domain's raw backlink count can exceed INT4's ~2.1B ceiling (github.com
-- was observed at 3.43B), which threw an unhandled Prisma overflow error on every
-- real analysis of a sufficiently large site. Widening is a safe, lossless change.
ALTER TABLE "BacklinkDomainAnalysis" ALTER COLUMN "backlinksTotal" TYPE BIGINT;
ALTER TABLE "BacklinkDomainAnalysis" ALTER COLUMN "dofollowLinks" TYPE BIGINT;
ALTER TABLE "BacklinkDomainAnalysis" ALTER COLUMN "nofollowLinks" TYPE BIGINT;
