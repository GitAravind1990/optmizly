import {
  Body, Button, Container, Head, Heading, Hr, Html,
  Link, Preview, Section, Text, Tailwind,
} from '@react-email/components'

interface WelcomeEmailProps {
  firstName?: string
  dashboardUrl: string
}

export function WelcomeEmail({ firstName = 'there', dashboardUrl }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to Optmizly â€” your AI content optimizer is ready</Preview>
      <Tailwind>
        <Body className="bg-slate-50 font-sans">
          <Container className="mx-auto py-12 px-4 max-w-xl">

            {/* Logo */}
            <Section className="text-center mb-8">
              <Text className="text-2xl font-black text-slate-900 m-0">◈ Optmizly</Text>
              <Text className="text-sm text-slate-500 m-0">AI Content Optimizer</Text>
            </Section>

            {/* Card */}
            <Section className="bg-white rounded-2xl border border-slate-200 p-8 mb-6">
              <Heading className="text-2xl font-black text-slate-900 mb-2 mt-0">
                Welcome, {firstName}! ðŸ‘‹
              </Heading>
              <Text className="text-slate-600 text-base leading-relaxed mb-6">
                Your Optmizly account is ready. You're on the <strong>Free plan</strong> with 3 analyses per month â€” enough to see exactly what the tool can do.
              </Text>

              <Hr className="border-slate-100 mb-6" />

              {/* What you get */}
              <Text className="text-sm font-bold text-slate-800 mb-3">What you can do right now:</Text>
              {[
                ['ðŸ“Š', 'Run a content analysis', 'Get an 8-dimension SEO score in 30 seconds'],
                ['ðŸ”', 'Fix your top issues', 'Prioritised list of problems with specific fixes'],
                ['ðŸ•³ï¸', 'Find content gaps', 'Discover topics competitors cover that you don\'t'],
              ].map(([icon, title, desc]) => (
                <Section key={title} className="mb-3">
                  <Text className="m-0 text-sm">
                    <span className="mr-2">{icon}</span>
                    <strong>{title}</strong> â€” {desc}
                  </Text>
                </Section>
              ))}

              <Hr className="border-slate-100 my-6" />

              <Button
                href={dashboardUrl}
                className="bg-blue-600 text-white font-bold text-sm px-8 py-3 rounded-xl no-underline block text-center"
              >
                Open Dashboard â†’
              </Button>
            </Section>

            {/* Tip */}
            <Section className="bg-blue-50 rounded-xl border border-blue-100 px-6 py-4 mb-6">
              <Text className="text-sm text-blue-800 m-0">
                <strong>ðŸ’¡ Quick tip:</strong> Paste any article URL into the Fetch & Analyse box â€” Optmizly will fetch the content and score it automatically.
              </Text>
            </Section>

            {/* Footer */}
            <Section className="text-center">
              <Text className="text-xs text-slate-400 m-0">
                Optmizly Â· AI-powered content optimization
              </Text>
              <Text className="text-xs text-slate-400 mt-1">
                <Link href="{{{RESEND_UNSUBSCRIBE_URL}}}" className="text-slate-400">Unsubscribe</Link>
              </Text>
            </Section>

          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}

export default WelcomeEmail

