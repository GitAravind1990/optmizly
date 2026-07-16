-- Card-upfront free trial: DoDo reports subscription status "trialing" during
-- a trial period. Previously collapsed into ACTIVE; now tracked distinctly so
-- the settings page and trial-reminder cron can tell trial vs. paid apart.
ALTER TYPE "SubscriptionStatus" ADD VALUE 'TRIALING';
