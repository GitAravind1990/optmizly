# Optmizly — AI Content Optimizer

AI-powered SEO platform covering search, GEO and AEO. 24 tools across five plans, built with
Next.js 15, Clerk, Prisma, Supabase, Groq and DoDo Payments.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15.5 (App Router), React 19 |
| Auth | Clerk v7 |
| Database | Supabase (PostgreSQL) + Prisma ORM v5 |
| AI | Groq in production — see note below |
| SEO data | DataForSEO, OpenPageRank, Google PageSpeed Insights, Google Places |
| Payments | DoDo Payments |
| Email | Resend + React Email |
| Analytics | PostHog, Vercel Analytics |
| Rate limiting | Upstash Redis |
| Hosting | Vercel (Pro) |
| Styling | Tailwind CSS |

**On the AI provider.** `LLM_PROVIDER` selects between `groq`, `anthropic` and `bedrock`, and
**production runs `groq`**. The code does not read that way: the wrapper is `src/lib/llm.ts`, the
entry point is `callLLM()`, and model ids look like `claude-haiku-4-5-20251001` because they are
mapped per provider. Do not infer the live provider from a function name — read the env. Whichever
is configured is a sub-processor receiving user content, so `/privacy` section 5 must name it.

---

## Plans and tools

A "tool" is one entry in `TOOL_GROUPS` (`src/app/dashboard/layout.tsx`) — what a user can click.
That constant is the source of truth for everything below; the counts are cumulative, since each
plan sees the tiers beneath it.

| Plan | Price | Tools | Credits/month |
|---|---|---|---|
| Free | $0 | 2 | 3 |
| Starter | $9 | 12 | 15 |
| Pro | $19 | 12 | 50 |
| Agency | $49 | 24 | 200 |
| Agency Plus | $99 | 24 | 500 |

Starter and Pro see the **identical** 12 tools and differ only in allowance. Agency Plus adds
unlimited client projects and 5 seats over Agency, not more tools.

**Free** — Content Analyzer, On-Page SEO

**Starter / Pro** — the two above plus Content Planner, Keyword Research, Rank Tracker,
Competitor Spy, Content Optimizer, E-E-A-T Analysis, Content Gap, AI Citation Plan, Backlinks,
Ranking Engine

**Agency / Agency Plus** — the twelve above plus SEO Audit, Local SEO Suite, SERP Audit, Topical
Authority, Local SEO, Cite Tracker, Performance Fixer, Client Reports, Geogrid + Review Velocity,
AI Regex, SEO Client Finder, AI Visibility

### Credits, not runs

The monthly allowance is denominated in weighted units, not tool runs. Tools that hit a paid
vendor cost more than one: `TOOL_COST_UNITS` in `src/lib/plans.ts` charges 3 for Keyword Research,
Competitor Spy, Geogrid, Local SEO Suite, Ranking Engine and AI Visibility, and 2 for Backlinks,
Rank Tracker, SERP Audit, Review Velocity, Client Reports, AI Citation Plan, Content Gap and
Content Planner. Everything unlisted costs 1, which is right for LLM-only tools and wrong for
anything calling DataForSEO.

### Public tools (no signup)

`/tools/ai-search-readiness`, `/tools/eeat` and `/tools/ai-regex` run without an account behind a
daily per-IP cap; `/tools/find-clients` is capped monthly, since each scan spends real vendor
money. All four are served by `/api/public/*` and metered in `src/lib/public-rate-limit.ts`.

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/GitAravind1990/optmizly.git
cd optmizly
npm install --legacy-peer-deps
```

### 2. Environment variables

```bash
cp .env.example .env.local
```

> `.env.example` is currently out of date — it still lists Lemon Squeezy variables from a
> previous payment provider. Use the list below as the authoritative set.

**Required to boot**

| Variable | Where from |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | dashboard.clerk.com |
| `CLERK_WEBHOOK_SECRET` | Clerk → Webhooks |
| `DATABASE_URL` | Supabase → Connect → Transaction pooler (must include `?pgbouncer=true`) |
| `DIRECT_URL` | Supabase → Connect → Session pooler, port 5432 (migrations) |
| `LLM_PROVIDER` | `groq`, `anthropic` or `bedrock` |
| `GROQ_API_KEY` *or* `ANTHROPIC_API_KEY` | console.groq.com / console.anthropic.com |
| `NEXT_PUBLIC_APP_URL` | e.g. `http://localhost:3000` |

**Payments** — `DODO_API_KEY`, `DODO_WEBHOOK_SECRET`, and a product id per plan and billing
period: `NEXT_PUBLIC_DODO_{STARTER,PRO,AGENCY,AGENCY_PLUS}_PRODUCT_ID` plus the matching
`*_ANNUAL_PRODUCT_ID`.

**SEO data** — `DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD`, `OPENPAGERANK_API_KEY`,
`GOOGLE_API_KEY` (PageSpeed Insights), `GOOGLE_PLACES_API_KEY`, `NEXT_PUBLIC_GOOGLE_MAPS_KEY`,
`NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`.

**Everything else** — `RESEND_API_KEY` and `EMAIL_FROM` (transactional email),
`CRON_SECRET` (**must be set**: it is asserted rather than interpolated, and an unset value makes
every cron callable by anyone), `ENCRYPTION_KEY` (Search Console token storage),
`GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET`, `UPSTASH_REDIS_REST_URL` /
`UPSTASH_REDIS_REST_TOKEN`, `NEXT_PUBLIC_POSTHOG_KEY` / `NEXT_PUBLIC_POSTHOG_HOST`,
`ADMIN_EMAIL`.

### 3. Set up the database

```bash
npx prisma generate
npx prisma migrate deploy
```

Use `migrate deploy`, not `db push`. The schema has a full migration history (0001–0032) and
pushing around it is what put the two a month out of sync once already. `migrate deploy` also
needs no shadow database, which `migrate dev` does and Supabase's pooler will not give you.

**New tables must enable row level security in the same migration**, with no policies:

```sql
ALTER TABLE "NewTable" ENABLE ROW LEVEL SECURITY;
```

Supabase exposes the `public` schema through PostgREST, so a table without RLS is readable by
anyone holding the project's anon key — a public credential by design. Prisma connects as
`postgres`, which has `rolbypassrls`, so this denies PostgREST and leaves the app untouched.

### 4. Run locally

```bash
npm run dev
```

Open http://localhost:3000.

---

## Deploy

Pushing to `main` deploys to production within seconds — the GitHub integration is live, so there
is no separate ship step. Treat a push as a release.

Add every variable from `.env.local` under Vercel → Settings → Environment Variables, and
**redeploy without cache** after any env change.

### Webhooks

| Provider | URL | Events |
|---|---|---|
| Clerk | `https://yourdomain.com/api/webhooks/clerk` | `user.created` |
| DoDo | `https://yourdomain.com/api/webhooks/dodo` | `subscription.created`, `.active`, `.updated`, `.cancelled`, `.renewed`, and `refund.*` |

### Scheduled jobs

Registered in `vercel.json` and described in `CRON_JOBS` (`src/lib/cron.ts`), which is what the
admin dashboard reads to notice one that has stopped firing:

| Route | Schedule (UTC) |
|---|---|
| `/api/cron/health` | 00:00, 06:00, 12:00, 18:00 |
| `/api/cron/prospect-waitlist` | 01:00 daily |
| `/api/cron/drip` | 09:00 daily |
| `/api/cron/weekly` | 09:00 Mondays |
| `/api/cron/gsc-sync` | 04:00 Mondays |

A cron reports only by side effect, so every route calls `cronAuthFailure(req)` on entry and
`recordCronRun(...)` on **every** exit path — normal return, early return and thrown error alike.

---

## Project structure

```
src/
├── app/
│   ├── api/           # ~100 route handlers (tools, admin, webhooks, cron, integrations)
│   ├── dashboard/     # signed-in tool pages
│   ├── tools/         # public no-signup tools
│   ├── admin/         # owner dashboard
│   ├── blog/          # DB-backed posts
│   └── pricing|terms|privacy|refund-policy|about|contact
├── components/
│   ├── ui/            # shared UI
│   └── marketing/     # landing page sections
├── lib/
│   ├── llm.ts         # provider-neutral model wrapper (callLLM)
│   ├── groq-limiter.ts# paces calls against the TPM bucket
│   ├── auth.ts        # requireAuth, quota charge + refund, PINNED_ACCOUNTS
│   ├── plans.ts       # plan limits, tool access, credit weights
│   ├── dodopayments.ts# checkout, portal, webhook verification
│   ├── dataforseo.ts  # keyword, SERP and ranking data
│   ├── export.ts      # CSV / PDF / DOCX exporters
│   ├── cron.ts        # CRON_JOBS registry + recordCronRun
│   └── email.ts       # Resend senders
├── emails/            # 14 React Email templates
└── context/           # shared content state
prisma/
└── migrations/        # 0001–0032
```

---

## Conventions worth knowing

- **Gating is never a plan-rank or equality check.** Starter ranks below Pro but unlocks the same
  tools, and `userPlan === 'AGENCY'` silently excluded Agency Plus. Name the satisfying plans
  explicitly, as `UNLOCKED_BY` does, and prefer `Record<Plan, …>` so a new tier is a compile error.
- **Quota is charged before the work.** Every exit that returns no result owes a `refundUsage` in
  the handler's outer `catch`, so validation failures `throw new AuthError(...)` rather than
  returning early.
- **`maxDuration` over 60 on a signed-in route is a promise the platform may not keep.** Clerk's
  session token expires 61s after minting and a POST cannot be refreshed, so a long request can
  401 *after* doing the work. Split it instead.
- **Exports must restate what the UI shows.** Live/Est badges and warnings are React-only; CSV and
  PDF serialize the raw data, so any distinction the UI draws has to be written into the file too.

`CLAUDE.md` carries the full set, including the copy that has to move whenever plans, limits or
sub-processors change.

---

## Scripts

```bash
npm run dev          # development server
npm run build        # prisma generate && next build
npm run start        # production server
npm run lint         # ESLint
npm run db:generate  # Prisma client
npm run db:push      # push schema (avoid — see Setup step 3)
npm run db:migrate   # prisma migrate dev
npm run db:studio    # Prisma Studio
```
