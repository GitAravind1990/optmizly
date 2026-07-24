-- Tracks whether ContentIdea.searchVolume/difficulty/cpc came from a real
-- DataForSEO lookup vs Claude's own invented "realistic" number.
ALTER TABLE "ContentIdea" ADD COLUMN "metricsReal" BOOLEAN NOT NULL DEFAULT false;
