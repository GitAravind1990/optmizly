import {
  Body, Button, Container, Head, Heading, Hr, Html,
  Preview, Section, Text, Tailwind,
} from '@react-email/components'

interface SubscriptionEmailProps {
  firstName?: string
  plan: 'Pro' | 'Agency'
  amount: string
  dashboardUrl: string
  nextBillingDate?: string
}

const PLAN_TOOLS: Record<string, string[]> = {
  Pro: ['E-E-A-T Analysis', 'Relevant Backlinks', 'AI Rewrite (with framework)', 'Citation Plan', 'Content Gap', 'AI Queries'],
  Agency: ['Everything in Pro', 'AI Cite Tracker', 'Local SEO Suite (4 tools)', 'SERP Competitor Audit', 'Topical Authority Mapper â˜…'],
}

export function SubscriptionEmail({
  firstName = 'there',
  plan,
  amount,
  dashboardUrl,
  nextBillingDate,
}: SubscriptionEmailProps) {
  const isAgency = plan === 'Agency'
  const accentColor = isAgency ? '#d97706' : '#2563eb'
  const limit = isAgency ? '200' : '50'

  return (
    <Html>
      <Head />
      <Preview>You're now on Optmizly {plan} â€” {limit} analyses/month unlocked</Preview>
      <Tailwind>
        <Body className="bg-slate-50 font-sans">
          <Container className="mx-auto py-12 px-4 max-w-xl">

            {/* Logo */}
            <Section className="text-center mb-8">
              <Text className="text-2xl font-black text-slate-900 m-0">â—ˆ Optmizly</Text>
            </Section>

            {/* Hero */}
            <Section
              className="rounded-2xl p-8 mb-6 text-center"
              style={{ background: isAgency ? 'linear-gradient(135deg,#92400e,#d97706)' : 'linear-gradient(135deg,#1e3a8a,#2563eb)' }}
            >
              <Text className="text-4xl m-0">ðŸŽ‰</Text>
              <Heading className="text-white text-2xl font-black mt-3 mb-2">
                You're on {plan}!
              </Heading>
              <Text className="text-white/80 text-sm m-0">
                {limit} analyses/month Â· {amount}/month
              </Text>
            </Section>

            {/* Card */}
            <Section className="bg-white rounded-2xl border border-slate-200 p-8 mb-6">
              <Text className="text-slate-700 text-base leading-relaxed mb-5">
                Hi {firstName}, your {plan} plan is now active. Here's what you've just unlocked:
              </Text>

              {PLAN_TOOLS[plan].map(tool => (
                <Text key={tool} className="text-sm text-slate-700 m-0 mb-2">
                  <span className="text-emerald-500 font-bold mr-2">âœ“</span>{tool}
                </Text>
              ))}

              <Hr className="border-slate-100 my-6" />

              {nextBillingDate && (
                <Text className="text-xs text-slate-400 mb-5">
                  Next billing date: <strong className="text-slate-600">{nextBillingDate}</strong>
                </Text>
              )}

              <Button
                href={dashboardUrl}
                className="text-white font-bold text-sm px-8 py-3 rounded-xl no-underline block text-center"
                style={{ background: accentColor }}
              >
                Start Using {plan} Tools â†’
              </Button>
            </Section>

            {/* Footer */}
            <Section className="text-center">
              <Text className="text-xs text-slate-400 m-0">
                Questions? Reply to this email â€” we respond within 24 hours.
              </Text>
              <Text className="text-xs text-slate-400 mt-1">Optmizly Â· Â© 2025</Text>
            </Section>

          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}

export default SubscriptionEmail

