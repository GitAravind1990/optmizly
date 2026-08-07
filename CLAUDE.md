# Optmizly - Claude Code Context

## Project Overview

AI-powered SaaS platform for content optimization. 18 tools across Free/Pro/Agency tiers.

## Tech Stack

- Frontend: Next.js 15.5.15, React, Tailwind CSS
- Backend: Next.js API Routes, Prisma ORM
- Database: PostgreSQL (Supabase)
- AI: Anthropic Claude API
- Auth: Clerk
- Payments: DoDo Payments
- Hosting: Vercel

## Key Directories

- src/app/ — Pages and API routes
- src/lib/ — Utilities (dodopayments.ts, prisma.ts, auth.ts, etc.)
- prisma/ — Database schema
- src/components/ — React components

## Build Notes

- Always redeploy WITHOUT cache for env var changes
- Postinstall script forces Prisma generation
- Webhook routes: /api/webhooks/dodo

## Changing plans, limits, trials or billing

These facts are stated in eight places and the code is only one of them. Every
audit so far has found the code correct and the copy stale — the trial cap was
fixed in the emails in July and still contradicted the Refund Policy three weeks
later. When you change anything in `src/lib/plans.ts` (`PLAN_LIMITS`,
`TRIAL_LIMITS`, `PLAN_TOOLS`), trial length, price, or cancellation behaviour,
update these in the same commit:

- `/terms` — plan limits, trial caps, billing frequency, what cancelling does
- `/refund-policy` — trial mechanics, what access survives a cancellation
- `/privacy` — sub-processors, what is stored and for how long
- `src/emails/` — `trial-started`, `limit-warning`, `limit-reached`,
  `drip-day1/3/7`, `weekly-summary`, `cancelled`
- `/pricing` — plan cards, comparison table, FAQ answers
- Tool-count copy — upgrade modal, welcome banner, homepage dashboard mockup

Two rules learned the hard way:

- **State the enforced number, not the marketed one.** A trial is capped at
  10/15, not the 50/200 the plan advertises. Copy that promises the plan limit
  sends trial users into a real 429.
- **Never say access continues if the code revokes it.** Terms, Refund Policy
  and the cancellation email all promise access until `currentPeriodEnd`; the
  webhook must not downgrade before then.

## Exports must restate what badges show

Live/Est badges, filters and warnings are React-only. CSV and PDF exports
serialize the raw data independently, so any distinction the UI draws has to be
written into the file too, or it is lost on download. When a tool's UI gains a
real-vs-estimated distinction, change its export in the same commit. Where a
value could not be assessed, say so — never emit a "No" that reads as a cleared
result.
