-- Tracks whether the subscription-activation confirmation email has been sent,
-- so the webhook can send it exactly once via an atomic conditional update
-- (guards against duplicate sends from concurrent webhook deliveries for the
-- same activation, and re-arms correctly on a genuine resubscription).
ALTER TABLE "Subscription" ADD COLUMN "welcomeEmailSent" BOOLEAN NOT NULL DEFAULT false;
