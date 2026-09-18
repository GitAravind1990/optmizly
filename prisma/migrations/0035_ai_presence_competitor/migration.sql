-- Domains the customer has declared to be competitors, per brand.
--
-- The only new table AI Presence needs, and it exists because of what the data does NOT say.
-- An AI answer's cited domains are just the sources it used: Wikipedia, Reddit, a news site,
-- and sometimes a rival. Treating every non-target cited domain as a competitor would print
-- inference as observation -- the one thing this feature is built not to do -- and would bury
-- the two rivals that matter under fifteen that do not.
--
-- So "competitor" is a human judgement and is stored as one. Everything else in AI Presence is
-- derived at read time from AiVisibilityRun, because a stored conclusion outlives the evidence
-- it came from; a marked competitor is not a conclusion, it is an input.
CREATE TABLE "AiPresenceCompetitor" (
    "id"     TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    -- Scoped to the brand rather than the account. A customer tracking two brands has two
    -- different sets of rivals, and AI Presence is scoped by brand + domain throughout.
    -- Lowercased on write, like every other host in this codebase.
    "brand"            TEXT NOT NULL,
    "competitorDomain" TEXT NOT NULL,

    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiPresenceCompetitor_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "AiPresenceCompetitor"
    ADD CONSTRAINT "AiPresenceCompetitor_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- One mark per rival per brand per account. Without this, marking twice would double every
-- gap that rival appears in, since gaps are counted per cited domain.
CREATE UNIQUE INDEX "AiPresenceCompetitor_userId_brand_competitorDomain_key"
    ON "AiPresenceCompetitor"("userId", "brand", "competitorDomain");

CREATE INDEX "AiPresenceCompetitor_userId_brand_idx"
    ON "AiPresenceCompetitor"("userId", "brand");

-- Required on every table here. This one maps an account to the rivals it watches, which is
-- commercially sensitive on its own and must not be readable through the public anon key.
ALTER TABLE "AiPresenceCompetitor" ENABLE ROW LEVEL SECURITY;
