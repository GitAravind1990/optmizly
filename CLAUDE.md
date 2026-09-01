# Optmizly - Claude Code Context

## Project Overview

AI-powered SaaS platform for content optimization. 23 tools across Free/Pro/Agency tiers.

**A "tool" is one entry in `TOOL_GROUPS`** (`src/app/dashboard/layout.tsx`) — what a user
can actually click. That is the only definition; don't count `PLAN_TOOLS` keys or
marketing figures. Counts are cumulative by tier, since each plan sees the tiers below it:

| Tier | Sees | Claim to use |
|---|---|---|
| Free | 2 | — |
| Pro | 12 | "12 Pro tools", never "all tools" |
| Agency | 23 | "all 23 tools" |

Pro does **not** get everything, so a Pro-facing upgrade prompt must say 12, not 23.
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

## Changing plans, limits or billing

These facts are stated in eight places and the code is only one of them. Every
audit so far has found the code correct and the copy stale — the trial cap was
fixed in the emails in July and still contradicted the Refund Policy three weeks
later. When you change anything in `src/lib/plans.ts` (`PLAN_LIMITS`,
`PLAN_TOOLS`), price, billing frequency, or cancellation behaviour, update
these in the same commit:

- `/terms` — plan limits, billing frequency, what cancelling does
- `/refund-policy` — when the card is charged, what access survives a cancellation
- `/privacy` — sub-processors, what is stored and for how long
- `src/emails/` — `limit-warning`, `limit-reached`,
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

- **There is no free trial.** Removed 2026-08-25: checkout charges immediately
  on every plan, and none of the four Dodo products carries a product-level
  trial either. `TRIAL_LIMITS` and the `TRIALING` branches in `auth.ts`, the
  webhook and `/dashboard/settings` are a deliberate backstop, not a live path —
  nothing can create a `TRIALING` subscription today. Do not reintroduce trial
  copy without reintroducing the trial. The free tier is the way to try it.
- **State the enforced number, not the marketed one.** Copy that promises a
  limit the code does not grant sends users into a real 429.
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
just the cron — and a rejected `vercel.json` takes the whole deploy with it, so the
symptom is unrelated work not shipping. (A six-hourly health check once sat committed
and unshipped for a day. That was recorded here as "nothing deploys on push"; see the
correction below — pushing now builds, so today the same mistake surfaces as a failed
deployment rather than silence.) Want a job several times a day, list it several
times, once per hour you want:
`vercel.json` allows repeated `path` entries and sends `x-vercel-cron-schedule`
to tell them apart. Budget for the jitter when setting `staleAfterMs` — two runs
six hours apart can land 6h59m apart.

**Pushing to `main` deploys to production, within seconds.** The project has a live
GitHub integration — deployments carry `githubDeployment: "1"` and full commit
metadata — so there is no separate ship step and no such thing as a pushed-but-unshipped
commit. Verified 2026-09-01: three commits pushed that day each produced a `READY`
production deployment, one of them 30 seconds after the push.

This corrects a claim that stood in this file and in several session notes — that
nothing deploys on push here. It is wrong today and it misleads in the worst
direction, because it invites you to push freely on the assumption nothing ships.
Treat a push as a production release.

**`vercel deploy --prod` works too, but it lies about failing.** On 2026-09-01 it
printed `{"status":"error","reason":"deploy_failed","message":"Not authorized"}` and
exited 1 — while the deployment it had just created went `READY` and served
production. That is the second recorded case of this CLI reporting failure for a
build that succeeded; the first died with `read ECONNRESET` while polling. **Check
`vercel ls` against the commit before retrying a failed deploy**, or you will ship
the same commit twice. In `vercel ls --format json`, a CLI deploy carries
`meta.actor` (`claude-code_*`) and a push-triggered one does not — that is how to
tell which of two same-sha deployments came from where.

**A production deploy landing inside a cron's scheduled hour can cost that run.**
Deploying re-registers the crons and reassigns their within-hour offset, and a run
that had not fired yet is simply lost for the day. Measured over Aug 20-27: every
missed run sat in an hour containing a deploy — Aug 23 lost both 06:00 health
(deploys 05:59, 06:12, 06:39 UTC) and 09:00 drip (09:28, 09:52), Aug 25 lost 09:00
drip (08:52, 09:33) — and every scheduled hour with no deploy in it fired. The
offsets prove the re-registration: drip sat at 09:05-09:06, then 09:17, then locked
to 09:26:1x, changing at exactly the two gaps. It is not certain, though: Aug 24 had
deploys at 18:03 and 18:12 and the 18:00 health run still fired at 18:06. A push is a
deploy, so this includes pushing — if a given day's run matters, do not ship during
its hour.

**Write mailers as backlog drains, and a missed run costs nothing but latency.** The
drip queries are `createdAt <= daysAgo(N)` *and* `drippedEmails: { none: ... }` —
"eligible and never sent", not "became eligible today" — so whoever a skipped run
would have caught is picked up by the next one. Both gaps above sent zero emails and
left zero backlog. An exact-day window would have dropped those users permanently
instead, which is the trap: the bug would be invisible, because the symptom is an
email that never arrives.

**`vercel crons ls` shows what Vercel actually has registered** and flags local
edits as pending deploy. The schedule in `vercel.json` is a request, not a fact;
this is the only way to see the difference.

**It writes every line to stderr, and stdout is empty.** So `vercel crons ls | ...`
pipes nothing, and `... 2>&1 | Select-Object -Last N` buffers the whole run and emits
only on completion — kill it early and you get *zero* output, which reads exactly like
a command that hung without printing. It is not hung. Use:

```powershell
$env:NO_UPDATE_NOTIFIER = '1'; vercel crons ls 2>&1 | Select-Object -First 40
```

Expect ~8s, of which the actual API call is ~300ms. The rest is Node startup plus two
subprocesses the CLI spawns *at exit* — an npm update check and a telemetry flush —
both spawned with `stdio: ["inherit","inherit","inherit","ipc"]`, so they hold the
parent's stderr handle and a PowerShell pipeline can outlive the finished command.
`NO_UPDATE_NOTIFIER=1` stops the update worker spawning (verified: 1 spawn line → 0);
`VERCEL_TELEMETRY_DISABLED=1` does not stop the telemetry one.

The update worker can never succeed on this machine — it is killed when the parent
exits, before it writes its cache, so it re-runs on every invocation and leaves a lock
file it never releases (`%LOCALAPPDATA%\com.vercel.cli\Cache\package-updates\`). Deleting
the lock does not fix it; the next run recreates it. Harmless, but it is why a stray
`vercel` command can occasionally stall far longer than 8s.

**Its "pending changes" diff is positional**, so with duplicate `path` entries it reports
phantom `modified` rows — four `/api/cron/health` entries reliably show three. Trust the
registered list above it, not the diff.

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
take one 429; that is expected and self-corrects via `markExhausted`.

Queuing is time, and on a signed-in route time is the thing you cannot spend — seven
sections through an 8,000/min bucket is ~160s, which no authenticated POST survives. The
answer is **fewer model calls per request**, not a bigger `maxDuration`: Content Optimizer
now runs one section per request (`/api/tools/content-optimizer/section`) with the client
walking the list. Reach for a long `maxDuration` only where nothing signed-in is waiting on
it, such as a cron.

## Giving a signed-in route a maxDuration over 60

**Clerk's session token expires 61 seconds after it is minted, and the lifetime cannot be
raised.** Measured on the production instance 2026-08-19: sign-in at 18:48:37 produced a
token with `exp` 18:49:38. The three session settings in the Clerk dashboard control how
long a *session* lasts in days; the configurable "token lifetime" belongs to custom JWT
templates, which are a different token that `auth()` does not read. There is no setting.

Clerk refreshes an expired token by redirecting through a handshake, which only works on a
**GET**. A POST cannot be refreshed — `session-token-expired-refresh-non-eligible-non-get`
— so a long signed-in POST can be rejected outright, and rejected *after* the handler has
finished. Content Optimizer charged the quota at 18:49:03, ran its seven sections, and the
401 landed at 18:50:59: the user paid a unit, the work completed, and the response said
"Not authenticated". The route never sees that 401, so **it cannot refund it, log it, or
report it** — none of the usual safety nets are reachable.

**Duration alone does not decide it, and this is not a clean cliff.** Measured 2026-08-22:
a 76.1s signed-in POST to `/api/tools/review-velocity` returned **200** with real data. So
~120s has failed, reproducibly and with Clerk naming the cause in its headers, while ~76s
has passed. What separates them is not established — plausibly how much life the cookie had
left when the request started, since the token expires 61s from *minting* and not from the
request. Do not restate the 61s figure as a threshold requests are guaranteed to fail past;
what is evidenced is that long POSTs fail *sometimes*, silently, after doing the work.

That is reason enough to keep them short. A failure that only shows up on some runs is
worse than one that always does — it survives testing and reaches users. Long GETs are
genuinely fine; they refresh.

So `maxDuration` above 60 on a route that calls `requireAuth`/`requireToolAccess` is a
promise the platform may not keep. Before setting one, make the request short instead.
Two worked examples in this repo:

- **A loop over N things** — return one result plus the remainder and let the client walk
  it: `/api/integrations/search-console/sync` syncs one property per call.
- **A vendor call that submits then polls** — return the task id and let the client poll a
  GET: `/api/tools/review-velocity` submits to DataForSEO and hands back a `taskId` rather
  than blocking on a 110s poll loop of its own.
- **N model calls that must all finish** — give each its own endpoint and let the client
  collect them: `/api/tools/content-optimizer/section` runs one of seven analyses, and the
  client posts the finished set to `/api/tools/content-optimizer` to be scored and stored.

That second shape moves the billing question. Charge on the request that produces something
the user keeps — the final store — so an abandoned run costs nothing, and use
`assertQuotaAvailable` on the first step so someone already at their limit is refused before
the work rather than after it.

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

## Adding a table

**Enable RLS on it in the same migration**, with no policies:

```sql
ALTER TABLE "NewTable" ENABLE ROW LEVEL SECURITY;
```

Every table in this database has row level security (migration 0003 swept the ones that
existed then). Supabase exposes the `public` schema through PostgREST, so a table without
it is readable by anyone holding the project's anon key — which is a public credential by
design. Prisma connects as `postgres`, which has `rolbypassrls`, so RLS with no policies
denies PostgREST and leaves the application completely unaffected. There is no downside to
remember and no policy to write.

This has already been missed once. Migrations 0011, 0016, 0017 and 0018 all enable it on
the tables they add; 0015 added `GscQueryRow` and did not, so every user's Search Console
query data — the queries their site ranks for, with clicks, impressions and positions — sat
exposed from the day the GSC corpus shipped until Supabase's linter flagged it more than
two weeks later. Nothing in the app broke, nothing failed, and no test would have caught
it: an over-permissive table behaves exactly like a correct one.

**Supabase's database linter is the thing that notices**, not the code and not Prisma.
`ALTER TABLE ... ENABLE ROW LEVEL SECURITY` is one line at the bottom of the migration; the
alternative is finding out from a security report.

## Exports must restate what badges show

Live/Est badges, filters and warnings are React-only. CSV and PDF exports
serialize the raw data independently, so any distinction the UI draws has to be
written into the file too, or it is lost on download. When a tool's UI gains a
real-vs-estimated distinction, change its export in the same commit. Where a
value could not be assessed, say so — never emit a "No" that reads as a cleared
result.
