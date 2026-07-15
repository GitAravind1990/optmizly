-- Tracks the timestamp of the last webhook event actually applied to this
-- subscription, so a late-arriving retry of an older event (DoDo retries
-- failed deliveries with backoff, and can land after a newer event already
-- succeeded) can be detected and ignored instead of clobbering newer state.
ALTER TABLE "Subscription" ADD COLUMN "lastWebhookEventAt" TIMESTAMP(3);
