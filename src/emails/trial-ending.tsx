import {
  Body, Button, Container, Head, Heading, Hr, Html,
  Preview, Section, Text, Tailwind,
} from '@react-email/components'

interface TrialEndingEmailProps {
  firstName?: string
  plan: 'Pro' | 'Agency'
  amount: string
  dashboardUrl: string
  trialEndDate?: string
}

export function TrialEndingEmail({
  firstName = 'there',
  plan,
  amount,
  dashboardUrl,
  trialEndDate,
}: TrialEndingEmailProps) {
  const isAgency = plan === 'Agency'
  const accentColor = isAgency ? '#d97706' : '#2563eb'

  return (
    <Html>
      <Head />
      <Preview>Your Optmizly {plan} trial ends soon</Preview>
      <Tailwind>
        <Body className="bg-slate-50 font-sans">
          <Container className="mx-auto py-12 px-4 max-w-xl">

            {/* Logo */}
            <Section className="text-center mb-8">
              <Text className="text-2xl font-black text-slate-900 m-0">◈ Optmizly</Text>
            </Section>

            {/* Hero */}
            <Section
              className="rounded-2xl p-8 mb-6 text-center"
              style={{ background: isAgency ? 'linear-gradient(135deg,#92400e,#d97706)' : 'linear-gradient(135deg,#1e3a8a,#2563eb)' }}
            >
              <Text className="text-4xl m-0">⏳</Text>
              <Heading className="text-white text-2xl font-black mt-3 mb-2">
                Your trial ends in 3 days
              </Heading>
              <Text className="text-white/80 text-sm m-0">
                {trialEndDate ?? 'soon'}
              </Text>
            </Section>

            {/* Card */}
            <Section className="bg-white rounded-2xl border border-slate-200 p-8 mb-6">
              <Text className="text-slate-700 text-base leading-relaxed mb-5">
                Hi {firstName}, your {plan} trial ends on <strong>{trialEndDate ?? 'your trial end date'}</strong>. After that, your card will be automatically charged {amount}/month to continue your {plan} plan.
              </Text>

              <Text className="text-slate-700 text-sm leading-relaxed mb-5">
                If you'd like to keep using {plan}, there's nothing you need to do — it'll continue automatically. If you'd rather not be charged, you can cancel anytime before your trial ends from your dashboard settings.
              </Text>

              <Hr className="border-slate-100 my-6" />

              <Button
                href={dashboardUrl}
                className="text-white font-bold text-sm px-8 py-3 rounded-xl no-underline block text-center"
                style={{ background: accentColor }}
              >
                Manage Your Subscription →
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

export default TrialEndingEmail
