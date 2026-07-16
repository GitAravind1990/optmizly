import {
  Body, Button, Container, Head, Heading, Hr, Html,
  Preview, Section, Text, Tailwind,
} from '@react-email/components'

interface TrialStartedEmailProps {
  firstName?: string
  plan: 'Pro' | 'Agency'
  amount: string
  dashboardUrl: string
  trialEndDate?: string
}

const PLAN_TOOLS: Record<string, string[]> = {
  Pro: ['E-E-A-T Analysis', 'Relevant Backlinks', 'AI Rewrite (with framework)', 'Citation Plan', 'Content Gap', 'AI Queries'],
  Agency: ['Everything in Pro', 'AI Cite Tracker', 'Local SEO Suite (4 tools)', 'SERP Competitor Audit', 'Topical Authority Mapper ★'],
}

export function TrialStartedEmail({
  firstName = 'there',
  plan,
  amount,
  dashboardUrl,
  trialEndDate,
}: TrialStartedEmailProps) {
  const isAgency = plan === 'Agency'
  const accentColor = isAgency ? '#d97706' : '#2563eb'
  const limit = isAgency ? '200' : '50'

  return (
    <Html>
      <Head />
      <Preview>Your 7-day Optmizly {plan} trial has started</Preview>
      <Tailwind>
        <Body className="bg-slate-50 font-sans">
          <Container className="mx-auto py-12 px-4 max-w-xl">

            {/* Logo */}
            <Section className="text-center mb-8">
              <Text className="text-2xl font-black text-slate-900 m-0">Optmizly</Text>
            </Section>

            {/* Hero */}
            <Section
              className="rounded-2xl p-8 mb-6 text-center"
              style={{ background: isAgency ? 'linear-gradient(135deg,#92400e,#d97706)' : 'linear-gradient(135deg,#1e3a8a,#2563eb)' }}
            >
              <Text className="text-4xl m-0">🚀</Text>
              <Heading className="text-white text-2xl font-black mt-3 mb-2">
                Your {plan} trial has started!
              </Heading>
              <Text className="text-white/80 text-sm m-0">
                {limit} analyses/month · full access for 7 days
              </Text>
            </Section>

            {/* Card */}
            <Section className="bg-white rounded-2xl border border-slate-200 p-8 mb-6">
              <Text className="text-slate-700 text-base leading-relaxed mb-5">
                Hi {firstName}, you've got full {plan} access for the next 7 days. Here's what's unlocked:
              </Text>

              {PLAN_TOOLS[plan].map(tool => (
                <Text key={tool} className="text-sm text-slate-700 m-0 mb-2">
                  <span className="text-emerald-500 font-bold mr-2">✓</span>{tool}
                </Text>
              ))}

              <Hr className="border-slate-100 my-6" />

              {trialEndDate && (
                <Text className="text-xs text-slate-400 mb-5">
                  Your trial ends <strong className="text-slate-600">{trialEndDate}</strong>, after which your card will be charged {amount}/month. Cancel anytime before then from your dashboard settings and you won't be charged.
                </Text>
              )}

              <Button
                href={dashboardUrl}
                className="text-white font-bold text-sm px-8 py-3 rounded-xl no-underline block text-center"
                style={{ background: accentColor }}
              >
                Start Using {plan} Tools →
              </Button>
            </Section>

            {/* Footer */}
            <Section className="text-center">
              <Text className="text-xs text-slate-400 m-0">
                Questions? Reply to this email. We respond within 24 hours.
              </Text>
              <Text className="text-xs text-slate-400 mt-1">Optmizly · © 2025</Text>
            </Section>

          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}

export default TrialStartedEmail
