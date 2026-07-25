import {
  Body, Button, Container, Head, Heading, Html,
  Preview, Section, Text, Tailwind,
} from '@react-email/components'

interface LimitWarningEmailProps {
  firstName?: string
  used: number
  limit: number
  plan: 'FREE' | 'PRO' | 'AGENCY'
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
  const isAgency = plan === 'AGENCY'
  const planLabel = isFree ? 'free' : plan === 'PRO' ? 'Pro' : 'Agency'
  const analysesLabel = isFree ? 'free analyses' : `${planLabel} plan analyses`

  return (
    <Html>
      <Head />
      <Preview>{`You have ${remaining} ${planLabel} ${remaining === 1 ? 'analysis' : 'analyses'} left this month`}</Preview>
      <Tailwind>
        <Body className="bg-slate-50 font-sans">
          <Container className="mx-auto py-12 px-4 max-w-xl">

            <Section className="text-center mb-8">
              <Text className="text-2xl font-black text-slate-900 m-0">Optmizly</Text>
            </Section>

            <Section className="bg-white rounded-2xl border border-slate-200 p-8 mb-6">
              <Heading className="text-xl font-black text-slate-900 mt-0 mb-2">
                {used} of {limit} {planLabel} {limit === 1 ? 'analysis' : 'analyses'} used
              </Heading>
              <Text className="text-slate-600 text-base leading-relaxed mb-5">
                Hi {firstName}, you've used {used} of your {limit} {analysesLabel} this month.
                You have <strong>{remaining} {remaining === 1 ? 'analysis' : 'analyses'}</strong> left before the monthly reset.
              </Text>

              {!isAgency && (
                <Section className="bg-blue-50 rounded-xl border border-blue-100 px-5 py-4 mb-6">
                  <Text className="text-sm font-bold text-blue-900 m-0 mb-1">
                    {isFree ? 'Upgrade to Pro: 50 analyses/month' : 'Upgrade to Agency: 200 analyses/month'}
                  </Text>
                  <Text className="text-sm text-blue-700 m-0">
                    {isFree
                      ? 'Plus E-E-A-T analysis, AI rewriter, content gap finder, rank tracker, backlink finder and more.'
                      : 'Plus SERP audits, local SEO suite, topical authority mapping, client reports and more.'}
                  </Text>
                </Section>
              )}

              {!isAgency && (
                <Button
                  href={pricingUrl}
                  className="bg-blue-600 text-white font-bold text-sm px-8 py-3 rounded-xl no-underline block text-center"
                >
                  See Plans &amp; Pricing →
                </Button>
              )}

              <Text className="text-xs text-slate-400 text-center mt-4 mb-0">
                Your {planLabel} analyses reset on the 1st of every month.
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
