# Optmizly - Claude Code Context

## Project Overview

AI-powered SaaS platform for content optimization. 22 tools across Free/Pro/Agency tiers.

**A "tool" is one entry in `TOOL_GROUPS`** (`src/app/dashboard/layout.tsx`) — what a user
can actually click. That is the only definition; don't count `PLAN_TOOLS` keys or
marketing figures. Counts are cumulative by tier, since each plan sees the tiers below it:

| Tier | Sees | Claim to use |
|---|---|---|
| Free | 3 | — |
| Pro | 13 | "13 Pro tools", never "all tools" |
| Agency | 22 | "all 22 tools" |

Pro does **not** get everything, so a Pro-facing upgrade prompt must say 13, not 22.
Adding a nav entry means updating the count in: `/login`, `/signup`, `PRO_BENEFITS` in
`src/components/ui/index.tsx`, `src/components/upgrade-modal.tsx`,
`src/components/welcome-banner.tsx`, and this file.

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

## Adding or switching a third party that receives user data

`/privacy` section 5 is a legal list of sub-processors, not a description of the
stack. Adding a vendor, or switching between two, changes who receives personal
data and has to be disclosed — GDPR does not treat this as optional.

This has already gone wrong once. `LLM_PROVIDER=groq` was set in production and
nobody touched the policy, so for roughly two months it told users their
submitted content went to Anthropic while it was going to Groq. Nothing in the
plans/billing checklist above covers "which third parties see user data", which
is exactly why it slipped.

Update `/privacy` in the same commit when you:

- add or replace an API that receives user content, URLs, domains or keywords
  (AI providers, SEO data vendors, crawlers)
- change `LLM_PROVIDER`, or any other env var that reroutes data to a different
  company — **an env-var change is a sub-processor change**
- add analytics, error tracking, email or payment services
- start storing a new category of data, or change how long any of it is kept

Name the provider actually in use. If a switch is configurable, list both and
say which is current, since either can be the live path.

**Careful with provider naming in code.** `callClaude()`, `src/lib/anthropic.ts`
and model ids like `claude-haiku-4-5-20251001` all route to Groq in production.
The source reads as though Anthropic is the provider and nothing contradicts it
until you read the env — do not infer the live provider from a function name.

## Exports must restate what badges show

Live/Est badges, filters and warnings are React-only. CSV and PDF exports
serialize the raw data independently, so any distinction the UI draws has to be
written into the file too, or it is lost on download. When a tool's UI gains a
real-vs-estimated distinction, change its export in the same commit. Where a
value could not be assessed, say so — never emit a "No" that reads as a cleared
result.
