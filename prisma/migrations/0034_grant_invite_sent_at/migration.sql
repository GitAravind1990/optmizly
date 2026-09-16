-- When the beta-access email was last sent for this grant.
--
-- The send previously left no trace anywhere. sendBetaAccessEmail returns its outcome to the
-- caller and console.logs a line, and that was the whole record: once the admin closed the tab,
-- "were these people invited?" had no answer, and the button's only honest behaviour was to mail
-- everyone again. That is the same shape as a cron that reports only by side effect -- the thing
-- CLAUDE.md warns about -- and it showed up the first time the question was asked.
--
-- Nullable because it means "never invited", which is the correct state for a grant that was
-- created a minute ago and the default for every row that existed before this column did.
ALTER TABLE "PinnedGrant" ADD COLUMN "inviteSentAt" TIMESTAMP(3);

-- No RLS statement here: 0033 enabled it on this table and it stays enabled through an ALTER.
