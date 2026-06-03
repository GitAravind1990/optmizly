# Optmizly â€” AI Content Optimizer

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
- Content Analyzer â€” 8-dimension SEO score
- Issues Audit â€” ranked content issues with fixes
- Entity Detection â€” missing entity gaps
- AI Cite Score â€” LLM citation likelihood

**Pro ($19/mo â€” 50 analyses)**
- E-E-A-T Analysis
- AI Rewrite (with H1/H2/H3 output)
- Relevant Backlinks finder
- Citation Plan
- Content Gap analyzer
- AI Query mapper

**Agency ($49/mo â€” 200 analyses)**
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
- **Clerk** â€” get keys from dashboard.clerk.com
- **Supabase** â€” get connection string from your project â†’ Connect button â†’ Transaction pooler
- **Anthropic** â€” get key from console.anthropic.com
- **Lemon Squeezy** â€” get API key from app.lemonsqueezy.com â†’ Settings â†’ API
- **Resend** â€” get key from resend.com

### 3. Create a separate .env for Prisma CLI

```bash
# .env (not .env.local) â€” use Session pooler port 5432 for migrations
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
3. Add all env vars from `.env.local` in Vercel â†’ Settings â†’ Environment Variables
4. Deploy

### After deploy â€” update webhooks

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
User          â€” clerkId, email, plan (FREE/PRO/AGENCY)
Subscription  â€” lsSubscriptionId, status, plan, billing dates
Usage         â€” userId, month, count (resets monthly)
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
â”œâ”€â”€ app/
â”‚   â”œâ”€â”€ api/           # 16 API routes
â”‚   â”œâ”€â”€ dashboard/     # 14 tool pages
â”‚   â”œâ”€â”€ pricing/       # Pricing page
â”‚   â”œâ”€â”€ login/         # Clerk SignIn
â”‚   â”œâ”€â”€ signup/        # Clerk SignUp
â”‚   â”œâ”€â”€ privacy/       # Privacy Policy
â”‚   â””â”€â”€ terms/         # Terms of Service
â”œâ”€â”€ components/
â”‚   â”œâ”€â”€ ui/            # Shared UI components
â”‚   â””â”€â”€ tools/         # ToolRunner, ProToolPage
â”œâ”€â”€ lib/
â”‚   â”œâ”€â”€ anthropic.ts   # Claude API wrapper
â”‚   â”œâ”€â”€ auth.ts        # requireAuth + quota check
â”‚   â”œâ”€â”€ export.ts      # CSV/PDF/DOCX exporters
â”‚   â”œâ”€â”€ lemonsqueezy.ts# LS checkout + webhooks
â”‚   â”œâ”€â”€ email.ts       # Resend email templates
â”‚   â””â”€â”€ plans.ts       # Plan limits + tool access
â”œâ”€â”€ context/
â”‚   â””â”€â”€ ContentContext.tsx  # Shared content state
â””â”€â”€ emails/            # React Email templates
```

