-- Nullable: existing rows and analyses run without the optional "Your Domain" field
-- (needed to compute real gap keywords via DataForSEO's domain_intersection) have no
-- value for this.
ALTER TABLE "CompetitorAnalysis" ADD COLUMN "userDomain" TEXT;
