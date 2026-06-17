import {
  Body, Button, Container, Head, Heading, Hr, Html,
  Preview, Section, Text, Tailwind,
} from '@react-email/components'

interface CancelledEmailProps {
  firstName?: string
  plan: string
  accessUntil?: string
  reactivateUrl: string
}

export function CancelledEmail({
  firstName = 'there',
  plan,
  accessUntil,
  reactivateUrl,
}: CancelledEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your Optmizly {plan} subscription has been cancelled</Preview>
      <Tailwind>
        <Body className="bg-slate-50 font-sans">
          <Container className="mx-auto py-12 px-4 max-w-xl">

            <Section className="text-center mb-8">
              <Text className="text-2xl font-black text-slate-900 m-0">◈ Optmizly</Text>
            </Section>

            <Section className="bg-white rounded-2xl border border-slate-200 p-8 mb-6">
              <Heading className="text-xl font-black text-slate-900 mt-0 mb-2">
                Subscription cancelled
              </Heading>
              <Text className="text-slate-600 text-base leading-relaxed mb-4">
                Hi {firstName}, we've cancelled your {plan} subscription as requested.
              </Text>

              {accessUntil && (
                <Section className="bg-blue-50 rounded-xl border border-blue-100 px-5 py-3 mb-5">
                  <Text className="text-sm text-blue-800 m-0">
                    You still have full <strong>{plan}</strong> access until{' '}
                    <strong>{accessUntil}</strong>. After that, your account moves to the Free plan.
                  </Text>
                </Section>
              )}

              <Text className="text-slate-600 text-sm leading-relaxed mb-5">
                If you cancelled by mistake or want to reactivate, you can do so any time — your data and settings are preserved.
              </Text>

              <Hr className="border-slate-100 mb-5" />

              <Button
                href={reactivateUrl}
                className="bg-blue-600 text-white font-bold text-sm px-8 py-3 rounded-xl no-underline block text-center"
              >
                Reactivate Subscription
              </Button>
            </Section>

            <Section className="text-center">
              <Text className="text-xs text-slate-400 m-0">
                Changed your mind? Reply to this email and we'll help.
              </Text>
              <Text className="text-xs text-slate-400 mt-1">Optmizly · © 2025</Text>
            </Section>

          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}

export default CancelledEmail

