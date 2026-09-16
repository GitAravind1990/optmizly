# Optmizly — AI Content Optimizer

AI-powered content optimization platform with 14 specialist SEO tools. Built with Next.js 15, Clerk, Prisma, Supabase, Anthropic Claude, and Lemon Squeezy.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15.2.5 (App Router) |
| Auth | Clerk v6 |
| Database | Supabase (PostgreSQL) + Prisma ORM |
| AI | Anthropic Claude (Haiku + Sonnet) |
| Payments | Lemon Squeezy |
| Email | Resend |
| Hosting | Vercel |
| Styling | Tailwind CSS |

---

## Tools

**Free (3 analyses/month)**
- Content Analyzer — 8-dimension SEO score
- Issues Audit — ranked content issues with fixes
- Entity Detection — missing entity gaps
- AI Cite Score — LLM citation likelihood

**Pro ($19/mo — 50 analyses)**
- E-E-A-T Analysis
- AI Rewrite (with H1/H2/H3 output)
- Relevant Backlinks finder
- Citation Plan
- Content Gap analyzer
- AI Query mapper

**Agency ($49/mo — 200 analyses)**
- Cite Tracker (ChatGPT/Perplexity simulation)
- Local SEO Suite (4 sub-tools)
- SERP Competitor Audit
- Topical Authority Mapper

---

## Setup

### 1. Clone and install

```bash
git clone your-repo
cd semanticrank
npm install --legacy-peer-deps
```

### 2. Environment variables

```bash
cp .env.example .env.local
```

Fill in all values in `.env.local`:
- **Clerk** — get keys from dashboard.clerk.com
- **Supabase** — get connection string from your project → Connect button → Transaction pooler
- **Anthropic** — get key from console.anthropic.com
- **Lemon Squeezy** — get API key from app.lemonsqueezy.com → Settings → API
- **Resend** — get key from resend.com

### 3. Create a separate .env for Prisma CLI

```bash
# .env (not .env.local) — use Session pooler port 5432 for migrations
DATABASE_URL=postgresql://postgres.xxxx:password@aws-0-region.pooler.supabase.com:5432/postgres
```

### 4. Set up database

```bash
npx prisma generate
npx prisma db push
```

### 5. Run locally

```bash
npm run dev
```

Open http://localhost:3000

---

## Deploy to Vercel

1. Push to GitHub
2. Import project in vercel.com
3. Add all env vars from `.env.local` in Vercel → Settings → Environment Variables
4. Deploy

### After deploy — update webhooks

**Clerk webhook:**
- URL: `https://yourdomain.com/api/webhooks/clerk`
- Event: `user.created`

**Lemon Squeezy webhook:**
- URL: `https://yourdomain.com/api/webhooks/lemonsqueezy`
- Events: `subscription_created`, `subscription_updated`, `subscription_cancelled`, `subscription_expired`, `subscription_payment_failed`

---

## Lemon Squeezy Products

Create two products in your LS store:

**Optmizly Pro**
- Monthly variant: $19.00/month
- Annual variant: $180.00/year ($15/month)

**Optmizly Agency**
- Monthly variant: $49.00/month
- Annual variant: $468.00/year ($39/month)

Copy all 4 variant IDs into your env vars.

---

## Database Schema

```
User          — clerkId, email, plan (FREE/PRO/AGENCY)
Subscription  — lsSubscriptionId, status, plan, billing dates
Usage         — userId, month, count (resets monthly)
```

---

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to database
npm run db:studio    # Open Prisma Studio
```

---

## Project Structure

```
src/
├── app/
│   ├── api/           # 16 API routes
│   ├── dashboard/     # 14 tool pages
│   ├── pricing/       # Pricing page
│   ├── login/         # Clerk SignIn
│   ├── signup/        # Clerk SignUp
│   ├── privacy/       # Privacy Policy
│   └── terms/         # Terms of Service
├── components/
│   ├── ui/            # Shared UI components
│   └── tools/         # ToolRunner, ProToolPage
├── lib/
│   ├── anthropic.ts   # Claude API wrapper
│   ├── auth.ts        # requireAuth + quota check
│   ├── export.ts      # CSV/PDF/DOCX exporters
│   ├── lemonsqueezy.ts# LS checkout + webhooks
│   ├── email.ts       # Resend email templates
│   └── plans.ts       # Plan limits + tool access
├── context/
│   └── ContentContext.tsx  # Shared content state
└── emails/            # React Email templates
```

