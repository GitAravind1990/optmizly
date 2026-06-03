# Optmizly - Claude Code Context

## Project Overview

AI-powered SaaS platform for content optimization. 15 tools across Free/Pro/Agency tiers.

## Tech Stack

- Frontend: Next.js 15.5.15, React, Tailwind CSS
- Backend: Next.js API Routes, Prisma ORM
- Database: PostgreSQL (Supabase)
- AI: Anthropic Claude API
- Auth: Clerk
- Payments: DoDo Payments
- Hosting: Vercel

## Key Directories

- src/app/ â€” Pages and API routes
- src/lib/ â€” Utilities (dodo.ts, prisma.ts, auth.ts, etc.)
- prisma/ â€” Database schema
- src/components/ â€” React components

## Build Notes

- Always redeploy WITHOUT cache for env var changes
- Postinstall script forces Prisma generation
- Webhook routes: /api/webhooks/dodo


