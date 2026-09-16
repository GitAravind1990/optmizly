import {
  Body, Button, Container, Head, Heading, Html,
  Preview, Section, Text, Tailwind,
} from '@react-email/components'
import { isCappedBelowPlan } from '@/lib/plans'

interface LimitWarningEmailProps {
  firstName?: string
  used: number
  limit: number
  plan: 'FREE' | 'STARTER' | 'PRO' | 'AGENCY' | 'AGENCY_PLUS'
  pricingUrl: string
}

// This email is sent to any plan approaching its monthly cap (requireAuth fires it
// for FREE/PRO/AGENCY alike), but previously hardcoded "free analyses" language and
// an "Upgrade to Pro" CTA unconditionally — confusing for a paying Pro/Agency
// customer, and actively wrong for Agency users (there's nothing higher to
// "upgrade" to; the CTA was suggesting what amounts to a downgrade).
export function LimitWarningEmail({
  firstName = 'there',
  used,
  limit,
  plan,
  pricingUrl,
}: LimitWarningEmailProps) {
  const remaining = limit - used
  const isFree = plan === 'FREE'
  const planLabel = isFree ? 'free'
    : plan === 'STARTER' ? 'Starter'
    : plan === 'PRO' ? 'Pro'
    : plan === 'AGENCY_PLUS' ? 'Agency Plus'
    : 'Agency'

  /**
   * An account capped below its plan's own allowance — a pinned one, which is the only kind
   * there is. Two things follow. Naming the plan beside the number would claim the plan
   * grants that number ("your 10 Agency plan analyses" says Agency gives ten), so the count
   * drops the plan name; and there is no tier to sell someone who was handed this plan
   * rather than billed for it.
   */
  const capped = isCappedBelowPlan(plan, limit)
  const noun = (n: number) => capped
    ? (n === 1 ? 'credit' : 'credits')
    : (n === 1 ? 'analysis' : 'analyses')
  const unit = (n: number) => capped ? `analysis ${noun(n)}` : `${planLabel} ${noun(n)}`

  /**
   * The next tier up, or nothing at the ceiling. A lookup rather than `isFree ? Pro : Agency`,
   * which sent Starter customers straight past Pro to the $49 plan, and — since it keyed off
   * `plan === 'AGENCY'` alone — pitched Agency to Agency Plus, the tier above it.
   */
  const NEXT: Record<string, { heading: string; detail: string }> = {
    FREE:    { heading: 'Upgrade to Starter: all 12 tools, 15 analyses/month',
               detail: 'E-E-A-T analysis, AI rewriter, content gap finder, rank tracker, backlink finder and more — $9/mo.' },
    STARTER: { heading: 'Upgrade to Pro: 50 analyses/month',
               detail: 'The same 12 tools with more than three times the volume, plus priority support.' },
    PRO:     { heading: 'Upgrade to Agency: 200 analyses/month',
               detail: 'Plus SERP audits, local SEO suite, topical authority mapping, client reports and more.' },
    AGENCY:  { heading: 'Upgrade to Agency Plus: 500 analyses/month',
               detail: 'Unlimited client projects, 5 team seats and double the prospect searches.' },
  }
  const nextTier = capped ? undefined : NEXT[plan]
  const analysesLabel = capped ? 'analysis credits'
    : isFree ? 'free analyses'
    : `${planLabel} plan analyses`

  return (
    <Html>
      <Head />
      <Preview>{`You have ${remaining} ${unit(remaining)} left this month`}</Preview>
      <Tailwind>
        <Body className="bg-slate-50 font-sans">
          <Container className="mx-auto py-12 px-4 max-w-xl">

            <Section className="text-center mb-8">
              <Text className="text-2xl font-black text-slate-900 m-0">Optmizly</Text>
            </Section>

            <Section className="bg-white rounded-2xl border border-slate-200 p-8 mb-6">
              <Heading className="text-xl font-black text-slate-900 mt-0 mb-2">
                {used} of {limit} {unit(limit)} used
              </Heading>
              <Text className="text-slate-600 text-base leading-relaxed mb-5">
                Hi {firstName}, you've used {used} of your {limit} {analysesLabel} this month.
                You have <strong>{remaining} {noun(remaining)}</strong> left before the monthly reset.
              </Text>

              {nextTier && (
                <Section className="bg-blue-50 rounded-xl border border-blue-100 px-5 py-4 mb-6">
                  <Text className="text-sm font-bold text-blue-900 m-0 mb-1">{nextTier.heading}</Text>
                  <Text className="text-sm text-blue-700 m-0">{nextTier.detail}</Text>
                </Section>
              )}

              {nextTier && (
                <Button
                  href={pricingUrl}
                  className="bg-blue-600 text-white font-bold text-sm px-8 py-3 rounded-xl no-underline block text-center"
                >
                  See Plans &amp; Pricing →
                </Button>
              )}

              <Text className="text-xs text-slate-400 text-center mt-4 mb-0">
                Your {capped ? 'analysis credits' : `${planLabel} analyses`} reset on the 1st of every month.
              </Text>
            </Section>

            <Section className="text-center">
              <Text className="text-xs text-slate-400 m-0">Optmizly · AI-powered content optimization</Text>
            </Section>

          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}

export default LimitWarningEmail
