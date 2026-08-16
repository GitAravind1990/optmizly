import { NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from './prisma'

/**
 * Shared plumbing for the scheduled jobs in vercel.json.
 *
 * Both halves of this file exist because of the same failure. In August a Groq key expired
 * and every AI tool on the site was dead for three days with nothing to show for it: the
 * product kept serving pages, no alert fired, and this plan retains no runtime logs, so
 * there was nothing to look at afterwards either. The health cron was built to catch that
 * class of silent death — then turned out to have it too, because a passing run wrote
 * nothing down and an absent run wrote nothing down, which look identical.
 *
 * Every cron here has that shape. They send mail and sync data on a schedule nobody
 * watches, and if one stops firing the only symptom is an email that never arrives.
 */

export type CronJob = 'health' | 'drip' | 'weekly' | 'trial-reminder' | 'gsc-sync'

/**
 * Every scheduled job, with the gap after which its silence is itself a finding.
 *
 * `schedule` duplicates vercel.json deliberately — that file is the only other place these
 * exist and it is not importable at runtime, so the alternative is a dashboard that cannot
 * say what it is waiting for. Change one, change the other.
 *
 * The windows allow a full extra period plus slack: a job that has skipped one whole run is
 * a real problem, but a run that landed a few hours late is not.
 */
export const CRON_JOBS: Record<
  CronJob,
  { label: string; schedule: string; staleAfterMs: number }
> = {
  health: {
    label: 'Health check',
    schedule: 'daily 07:00 UTC',
    staleAfterMs: 26 * 60 * 60 * 1000,
  },
  drip: {
    label: 'Drip emails',
    schedule: 'daily 09:00 UTC',
    staleAfterMs: 26 * 60 * 60 * 1000,
  },
  'trial-reminder': {
    label: 'Trial reminders',
    schedule: 'daily 09:00 UTC',
    staleAfterMs: 26 * 60 * 60 * 1000,
  },
  weekly: {
    label: 'Weekly summary',
    schedule: 'Mondays 09:00 UTC',
    staleAfterMs: 8 * 24 * 60 * 60 * 1000,
  },
  'gsc-sync': {
    label: 'Search Console sync',
    schedule: 'Mondays 04:00 UTC',
    staleAfterMs: 8 * 24 * 60 * 60 * 1000,
  },
}

/** Runs older than this are pruned. Long enough to answer "was it already failing last
 *  month", short enough that the table never needs thinking about. */
const RETAIN_DAYS = 90

/**
 * Guards a cron route. Returns a 401 Response to return, or null to proceed.
 *
 * CRON_SECRET is asserted rather than interpolated. Unset, `Bearer ${process.env.CRON_SECRET}`
 * evaluates to the string "Bearer undefined" — a value any caller on the internet can send,
 * which would hand over the drip mailer and the Search Console sync. It is set in production,
 * but an empty env var is exactly the kind of thing that goes unnoticed here: the same file
 * that hid a dead API key for three days is the one this reads.
 */
export function cronAuthFailure(req: NextRequest): Response | null {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error('[Cron] CRON_SECRET is not set — refusing to run')
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (req.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

/**
 * Writes down that a job ran, and how it went.
 *
 * This is the only evidence a *successful* run leaves anywhere: alerts are failure-only and
 * nothing else persists. The absence of a recent row is what makes a job that has silently
 * stopped firing visible, so the row matters even when everything is fine.
 *
 * Never throws. Bookkeeping must not be able to fail a job whose real work already
 * succeeded — and a database outage takes this down with it, which is why the health cron
 * keeps its independent email and 503 alongside.
 */
export async function recordCronRun(
  job: CronJob,
  ok: boolean,
  ms: number,
  detail: unknown
): Promise<void> {
  try {
    await prisma.cronRun.create({
      data: { job, ok, ms, detail: detail as Prisma.InputJsonValue },
    })
    await prisma.cronRun.deleteMany({
      where: { ranAt: { lt: new Date(Date.now() - RETAIN_DAYS * 24 * 60 * 60 * 1000) } },
    })
  } catch (e) {
    console.error(`[Cron/${job}] could not record run:`, e)
  }
}
