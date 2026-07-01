import {
  Body, Button, Container, Head, Heading, Hr, Html,
  Link, Preview, Section, Text, Tailwind,
} from '@react-email/components'

interface DripDay3Props {
  firstName?: string
  pricingUrl: string
}

export function DripDay3Email({ firstName = 'there', pricingUrl }: DripDay3Props) {
  return (
    <Html>
      <Head />
      <Preview>What 15 more Optmizly tools look like</Preview>
      <Tailwind>
        <Body className="bg-slate-50 font-sans">
          <Container className="mx-auto py-12 px-4 max-w-xl">

            <Section className="text-center mb-8">
              <Text className="text-2xl font-black text-slate-900 m-0">◈ Optmizly</Text>
              <Text className="text-sm text-slate-500 m-0">AI Content Optimizer</Text>
            </Section>

            <Section className="bg-white rounded-2xl border border-slate-200 p-8 mb-6">
              <Heading className="text-2xl font-black text-slate-900 mb-2 mt-0">
                Hey {firstName} — here's what Pro unlocks
              </Heading>
              <Text className="text-slate-600 text-base leading-relaxed mb-6">
                You've been on the Free plan for a few days. Here are the tools most Pro users run first:
              </Text>

              {[
                ['📈', 'SERP Audit', "See exactly why you're not ranking — real competitor breakdown with a step-by-step recovery plan."],
                ['🎯', 'Rank Tracker', 'Track keyword positions over time. Get alerts when you move up or drop.'],
                ['⭐', 'E-E-A-T Analysis', 'Score your expertise and trust signals the way Google evaluates them.'],
                ['📊', 'Ranking Engine', 'Enter a keyword and domain — get a probability score before you write a word.'],
              ].map(([icon, title, desc]) => (
                <Section key={title} className="mb-5">
                  <Text className="m-0 text-sm font-bold text-slate-800">
                    <span className="mr-2">{icon}</span>{title}
                  </Text>
                  <Text className="m-0 text-sm text-slate-500 mt-1 pl-6">{desc}</Text>
                </Section>
              ))}

              <Hr className="border-slate-100 my-6" />

              <Text className="text-slate-600 text-sm mb-6">
                All 17 tools. One flat price. <strong>Pro is $19/mo</strong> — cancel any time.
              </Text>

              <Button
                href={pricingUrl}
                className="bg-blue-600 text-white font-bold text-sm px-8 py-3 rounded-xl no-underline block text-center"
              >
                Upgrade to Pro — $19/mo →
              </Button>
            </Section>

            <Section className="text-center">
              <Text className="text-xs text-slate-400 m-0">Optmizly · AI-powered content optimization</Text>
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

export default DripDay3Email
