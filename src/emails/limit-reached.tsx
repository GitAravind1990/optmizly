import {
  Body, Button, Container, Head, Heading, Html,
  Preview, Section, Text, Tailwind,
} from '@react-email/components'
import { isCappedBelowPlan } from '@/lib/plans'

interface LimitReachedEmailProps {
  firstName?: string
  limit: number
  plan: 'FREE' | 'STARTER' | 'PRO' | 'AGENCY' | 'AGENCY_PLUS'
  pricingUrl: string
}

// Same plan-aware fix as LimitWarningEmail — this is sent to any plan that hits
// its cap, not just FREE, but previously always said "free limit" and pushed an
// "Upgrade to Pro" CTA even at Agency (nothing higher to upgrade to).
export function LimitReachedEmail({
  firstName = 'there',
  limit,
  plan,
  pricingUrl,
}: LimitReachedEmailProps) {
  const isFree = plan === 'FREE'
  // "Nothing left to upgrade to", which is now Agency Plus rather than Agency. Named for
  // what it means instead of for one plan, so the next tier added cannot silently make it
  // wrong again — as adding Agency Plus just did to `isAgency`.
  const isTopTier = plan === 'AGENCY_PLUS'
  const planLabel = isFree
    ? 'free'
    : plan === 'STARTER' ? 'Starter'
    : plan === 'PRO' ? 'Pro'
    : plan === 'AGENCY' ? 'Agency'
    : 'Agency Plus'

  /**
   * An account capped below its plan's own allowance — a pinned one, which is the only kind
   * there is. It behaves like the top tier here (reset date, no pitch) for a different
   * reason: not that there is nothing above it, but that it was granted this plan rather
   * than billed for it, so selling it the tier above is aimed at the wrong person. The plan
   * name also comes out of the count, since "all 10 Agency analyses" claims Agency grants
   * ten.
   */
  const capped = isCappedBelowPlan(plan, limit)
  const noun = capped
    ? (limit === 1 ? 'credit' : 'credits')
    : (limit === 1 ? 'analysis' : 'analyses')
  const unit = capped ? `analysis ${noun}` : `${planLabel} ${noun}`
  // planLabel is lowercase for Free, and the footer line below starts a sentence with it --
  // every Free user's limit email has been signing off "free analyses reset on the 1st".
  const sentenceLabel = planLabel.charAt(0).toUpperCase() + planLabel.slice(1)

  // Always the *next* tier up, never the top one. This has now been wrong twice for the
  // same reason — a two-way branch outliving the two-tier world it was written in — so it
  // is a lookup rather than a chain of ternaries.
  const NEXT: Record<string, { heading: string; detail: string }> = {
    FREE: {
      heading: 'Upgrade to Starter ($9/month)',
      detail: 'All 12 tools unlocked — E-E-A-T analysis, AI rewriter, content gap finder, rank tracker, backlink finder — with 15 analyses a month.',
    },
    // Starter already has every tool Pro has, so this sells volume only. Listing tools here
    // would promise an unlock the customer is already paying for.
    STARTER: {
      heading: 'Upgrade to Pro ($19/month)',
      detail: '50 analyses/month instead of 15 — the same 12 tools, with room to run the data-heavy ones weekly.',
    },
    PRO: {
      heading: 'Upgrade to Agency ($49/month)',
      detail: '200 analyses/month plus SERP audits, local SEO suite, topical authority mapping, client reports and more.',
    },
    AGENCY: {
      heading: 'Upgrade to Agency Plus ($99/month)',
      detail: '500 analyses/month, unlimited client projects, 5 team seats and double the prospect searches.',
    },
  }
  const nextTier = capped ? undefined : NEXT[plan]

  return (
    <Html>
      <Head />
      <Preview>{`You've used all ${limit} ${unit} this month`}</Preview>
      <Tailwind>
        <Body className="bg-slate-50 font-sans">
          <Container className="mx-auto py-12 px-4 max-w-xl">

            <Section className="text-center mb-8">
              <Text className="text-2xl font-black text-slate-900 m-0">Optmizly</Text>
            </Section>

            <Section className="bg-white rounded-2xl border border-slate-200 p-8 mb-6">
              <Heading className="text-xl font-black text-slate-900 mt-0 mb-2">
                {capped ? "You've used this month's credits" : `You've hit your ${planLabel} limit`}
              </Heading>
              <Text className="text-slate-600 text-base leading-relaxed mb-5">
                Hi {firstName}, you've used all <strong>{limit} {unit}</strong> for this month.
                {capped ? ' They reset on the 1st. Need more before then? Reply to the email that gave you access.'
                  : isTopTier ? ' Your analyses reset on the 1st.'
                  : ' Your analyses reset on the 1st, or upgrade now to keep going.'}
              </Text>

              {!isTopTier && nextTier && (
                <Section className="bg-blue-50 rounded-xl border border-blue-100 px-5 py-4 mb-6">
                  <Text className="text-sm font-bold text-blue-900 m-0 mb-1">
                    {nextTier.heading}
                  </Text>
                  <Text className="text-sm text-blue-700 m-0">
                    {nextTier.detail}
                  </Text>
                </Section>
              )}

              {!isTopTier && nextTier && (
                <Button
                  href={pricingUrl}
                  className="bg-blue-600 text-white font-bold text-sm px-8 py-3 rounded-xl no-underline block text-center"
                >
                  Upgrade Now →
                </Button>
              )}

              <Text className="text-xs text-slate-400 text-center mt-4 mb-0">
                {capped ? 'Analysis credits' : `${sentenceLabel} analyses`} reset on the 1st of every month.
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

export default LimitReachedEmail
