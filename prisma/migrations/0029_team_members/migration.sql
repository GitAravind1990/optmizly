-- Seats: a second person working inside someone else's account.
--
-- A membership row rather than a new Account entity. Every table here keys on "userId" and
-- everything resolves through getOrCreateUser, so a member's session resolving to the
-- owner's User row shares clients, quota and history by construction - no per-feature
-- sharing rule to add and forget.

CREATE TYPE "TeamMemberStatus" AS ENUM ('PENDING', 'ACTIVE');

CREATE TABLE "TeamMember" (
    "id"         TEXT NOT NULL,
    "ownerId"    TEXT NOT NULL,
    "email"      TEXT NOT NULL,
    -- Null until first sign-in, which is what flips PENDING to ACTIVE.
    "clerkId"    TEXT,
    "status"     "TeamMemberStatus" NOT NULL DEFAULT 'PENDING',
    "invitedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- Cascade: deleting an account removes its seats. The members keep their own accounts,
-- which they get back the moment the membership stops resolving.
ALTER TABLE "TeamMember"
    ADD CONSTRAINT "TeamMember_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- One invite per address per account.
CREATE UNIQUE INDEX "TeamMember_ownerId_email_key" ON "TeamMember"("ownerId", "email");

-- A person holds at most one seat anywhere. Without this two owners could invite the same
-- address and which account they resolved into would depend on row order.
CREATE UNIQUE INDEX "TeamMember_clerkId_key" ON "TeamMember"("clerkId");

CREATE INDEX "TeamMember_ownerId_idx" ON "TeamMember"("ownerId");
CREATE INDEX "TeamMember_email_idx" ON "TeamMember"("email");

-- Required on every table here. This one maps people to accounts, so a PostgREST read
-- through the public anon key would expose who works for whom.
ALTER TABLE "TeamMember" ENABLE ROW LEVEL SECURITY;
