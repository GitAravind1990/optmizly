import {
  Body, Button, Container, Head, Heading, Html,
  Preview, Section, Text, Tailwind,
} from '@react-email/components'

interface LimitReachedEmailProps {
  firstName?: string
  limit: number
  pricingUrl: string
}

export function LimitReachedEmail({
  firstName = 'there',
  limit,
  pricingUrl,
}: LimitReachedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{`You've used all ${limit} free ${limit === 1 ? 'analysis' : 'analyses'} this month`}</Preview>
      <Tailwind>
        <Body className="bg-slate-50 font-sans">
          <Container className="mx-auto py-12 px-4 max-w-xl">

            <Section className="text-center mb-8">
              <Text className="text-2xl font-black text-slate-900 m-0">◈ Optmizly</Text>
            </Section>

            <Section className="bg-white rounded-2xl border border-slate-200 p-8 mb-6">
              <Heading className="text-xl font-black text-slate-900 mt-0 mb-2">
                You've hit your free limit
              </Heading>
              <Text className="text-slate-600 text-base leading-relaxed mb-5">
                Hi {firstName}, you've used all <strong>{limit} free {limit === 1 ? 'analysis' : 'analyses'}</strong> for this month.
                Your analyses reset on the 1st, or upgrade now to keep going.
              </Text>

              <Section className="bg-blue-50 rounded-xl border border-blue-100 px-5 py-4 mb-6">
                <Text className="text-sm font-bold text-blue-900 m-0 mb-1">Upgrade to Pro ($19/month)</Text>
                <Text className="text-sm text-blue-700 m-0">
                  50 analyses/month plus E-E-A-T analysis, AI rewriter, content gap finder, rank tracker, backlink finder and more.
                </Text>
              </Section>

              <Button
                href={pricingUrl}
                className="bg-blue-600 text-white font-bold text-sm px-8 py-3 rounded-xl no-underline block text-center"
              >
                Upgrade Now →
              </Button>

              <Text className="text-xs text-slate-400 text-center mt-4 mb-0">
                Free analyses reset on the 1st of every month.
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
