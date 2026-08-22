# Optmizly - Claude Code Context

## Project Overview

AI-powered SaaS platform for content optimization. 22 tools across Free/Pro/Agency tiers.

**A "tool" is one entry in `TOOL_GROUPS`** (`src/app/dashboard/layout.tsx`) — what a user
can actually click. That is the only definition; don't count `PLAN_TOOLS` keys or
marketing figures. Counts are cumulative by tier, since each plan sees the tiers below it:

| Tier | Sees | Claim to use |
|---|---|---|
| Free | 2 | — |
| Pro | 12 | "12 Pro tools", never "all tools" |
| Agency | 22 | "all 22 tools" |

Pro does **not** get everything, so a Pro-facing upgrade prompt must say 12, not 22.
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

Adding a tool that makes real third-party API calls? Give it a weight in
`TOOL_COST_UNITS` (`src/lib/plans.ts`). Unlisted means 1 unit, which is right for
LLM-only tools and wrong for anything hitting DataForSEO — a keyword research
costs ~$0.20 a run against a $19 plan. Weighted tools must also appear in the
Terms §3 list, both pricing cards, the "what counts as one analysis" FAQ, and
they get a `2×`/`3×` badge in the sidebar automatically.

Three rules learned the hard way:

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

## Adding a scheduled job

Every cron here reports only by side effect — an email that arrives, a corpus
that grows — so one that has stopped firing looks exactly like one with nothing
to do. A Groq key expired in August and took every AI tool down for three days
with nothing to show for it; this plan retains no runtime logs, so there was
nothing to read afterwards either. Three things in the same commit:

- the entry in `vercel.json`
- an entry in `CRON_JOBS` (`src/lib/cron.ts`) with its schedule and the gap after
  which its silence is a finding — a job missing from here never appears on the
  admin dashboard and nothing will notice it stopping
- `cronAuthFailure(req)` at the top of the route, and `recordCronRun(...)` on
  **every** exit path: the normal return, early returns, and thrown errors. A
  `finally` that cannot see a throw records a crash as a successful run.

**This is a Hobby plan: one run per day per cron expression, fired anywhere
inside the scheduled hour.** Anything more frequent — `0 */6 * * *`, `*/30 * * * *`
— is rejected when you deploy, so it breaks the next deploy of *anything*, not
just the cron. It also fails quietly in git: a six-hourly health check sat
committed and unshipped for a day because nothing deploys on push here. Want a
job several times a day, list it several times, once per hour you want:
`vercel.json` allows repeated `path` entries and sends `x-vercel-cron-schedule`
to tell them apart. Budget for the jitter when setting `staleAfterMs` — two runs
six hours apart can land 6h59m apart.

**`vercel crons ls` shows what Vercel actually has registered** and flags local
edits as pending deploy. The schedule in `vercel.json` is a request, not a fact;
this is the only way to see the difference.

`CRON_SECRET` is asserted, never interpolated. Left unset,
`Bearer ${process.env.CRON_SECRET}` is the literal string `"Bearer undefined"` —
a value anyone on the internet can send.

Judge a mailer by whether anything threw, not by whether it sent. Zero sent is
the normal state on most days, so "sent > 0" as a success condition marks a
healthy job unhealthy and trains you to ignore it.

## Setting max_tokens on a Groq call

**Groq charges the per-minute bucket `prompt_tokens + max_tokens` when it accepts the
request, and never refunds the part the model did not use.** Measured 2026-08-19: a
`max_tokens: 3000` call whose completion was 41 tokens decremented
`x-ratelimit-remaining-tokens` by 3,028, and the bucket then climbed back only at the
plain refill rate. So `max_tokens` is not a safety ceiling that costs nothing when unused —
it is the price. Content Optimizer sent seven sections at one copy-pasted 3,000 and was
charged 33,849 tokens to do 13,573 tokens of work, four times an 8,000/min bucket, which
is why its seven parallel calls 429'd each other into a 502.

Size budgets from **measured completion tokens on the real prompt at the real model**, and
from the largest of several samples — reasoning is not stable run to run, and a budget set
from one sample will truncate on the next. Extract the prompt from the route and call Groq
directly; the signed-in routes need a Clerk session.

Truncation does not look like truncation downstream: `extractJSON`'s repair pass closes the
brackets, so a cut-off section arrives well-formed with fields missing. `llm.ts` logs
`truncated at N tokens` when it sees it — that line means a budget is too tight.

`src/lib/groq-limiter.ts` queues calls against a local mirror of the bucket so they pace
instead of colliding. It is per-process and starts optimistic, so a cold start can still
take one 429; that is expected and self-corrects via `markExhausted`. Anything making
several model calls in one request needs a `maxDuration` that can absorb the queuing —
seven sections through an 8,000/min bucket is ~160s, not 30.

## Giving a signed-in route a maxDuration over 60

**Clerk's session token expires 61 seconds after it is minted, and the lifetime cannot be
raised.** Measured on the production instance 2026-08-19: sign-in at 18:48:37 produced a
token with `exp` 18:49:38. The three session settings in the Clerk dashboard control how
long a *session* lasts in days; the configurable "token lifetime" belongs to custom JWT
templates, which are a different token that `auth()` does not read. There is no setting.

Clerk refreshes an expired token by redirecting through a handshake, which only works on a
**GET**. A POST cannot be refreshed — `session-token-expired-refresh-non-eligible-non-get`
— so a signed-in POST that runs past ~60s is rejected outright.

It is rejected *after* the handler has finished. Content Optimizer charged the quota at
18:49:03, ran its seven sections, and the 401 landed at 18:50:59: the user paid a unit,
the work completed, and the response said "Not authenticated". The route never sees that
401, so **it cannot refund it, log it, or report it** — none of the usual safety nets are
reachable. Long GETs are fine; they refresh.

So `maxDuration` above 60 on a route that calls `requireAuth`/`requireToolAccess` is a
promise the platform will not keep. Before setting one, make the request short instead:
split it into several client-driven calls, or make the underlying work faster. Where the
work is a loop over N things, return one result plus the remainder and let the client walk
it — see `/api/integrations/search-console/sync`.

Judge this by measured wall time, not by the limit: a route capped at 90 that really takes
20s is fine, and one capped at 300 that takes 160s is broken today.

## Refund the quota when the run does not land

`requireAuth` charges the monthly quota *before* any work happens, so every exit that does
not return a result owes the user that unit back. All 31 charging routes do this now, in
one shape — keep it:

- `let charged: string | null = null` on the handler, set to `user.userId` immediately
  after `requireAuth`
- `if (charged) await refundUsage(charged, '<tool>')` as the **first** statement of the
  handler's outer `catch`, before anything that returns
- `charged = null` at the point the run produces something durable the user can still open
  — a saved report, a created project. A failure after that keeps the charge, because they
  got something. Most routes write and immediately return, so most do not need this line.

Refund in the `catch`, never at individual throw sites: a refund attached to one failure
mode is a refund the next failure mode will not have.

That only works if failures actually reach the catch, so **validation exits are `throw new
AuthError(status, message)`, not `return apiError(...)`**. An early return leaves the
handler without passing through the catch and keeps the charge.

While converting those: `apiError(new Error(msg))` is **not** a 400. A bare `Error` matches
none of `apiError`'s branches and falls through to the generic one, so it returns
`500 Internal server error` and throws the message away. Seven routes were reporting
"Content too short" and "City is required" that way.

## Exports must restate what badges show

Live/Est badges, filters and warnings are React-only. CSV and PDF exports
serialize the raw data independently, so any distinction the UI draws has to be
written into the file too, or it is lost on download. When a tool's UI gains a
real-vs-estimated distinction, change its export in the same commit. Where a
value could not be assessed, say so — never emit a "No" that reads as a cleared
result.
