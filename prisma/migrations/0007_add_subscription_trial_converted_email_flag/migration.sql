-- Separate exactly-once dedup flag for the "your trial converted to a paid
-- subscription" email, independent of welcomeEmailSent (the "trial started"
-- email) -- DoDo keeps the same dodoSubscriptionId across trial->paid, so
-- isNewCycle doesn't reset welcomeEmailSent at conversion time.
ALTER TABLE "Subscription" ADD COLUMN "trialConvertedEmailSent" BOOLEAN NOT NULL DEFAULT false;
