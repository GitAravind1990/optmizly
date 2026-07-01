import {
  Body, Button, Container, Head, Heading, Hr, Html,
  Link, Preview, Section, Text, Tailwind,
} from '@react-email/components'

interface DripDay7Props {
  firstName?: string
  dashboardUrl: string
  pricingUrl: string
  isFree: boolean
}

export function DripDay7Email({ firstName = 'there', dashboardUrl, pricingUrl, isFree }: DripDay7Props) {
  return (
    <Html>
      <Head />
      <Preview>Still working on your SEO? Here's what to do next in Optmizly</Preview>
      <Tailwind>
        <Body className="bg-slate-50 font-sans">
          <Container className="mx-auto py-12 px-4 max-w-xl">

            <Section className="text-center mb-8">
              <Text className="text-2xl font-black text-slate-900 m-0">◈ Optmizly</Text>
              <Text className="text-sm text-slate-500 m-0">AI Content Optimizer</Text>
            </Section>

            <Section className="bg-white rounded-2xl border border-slate-200 p-8 mb-6">
              <Heading className="text-2xl font-black text-slate-900 mb-2 mt-0">
                Still working on your SEO, {firstName}?
              </Heading>
              <Text className="text-slate-600 text-base leading-relaxed mb-6">
                It's been a week. Whether you've been using Optmizly every day or haven't had a chance yet — here's what tends to move the needle most:
              </Text>

              {[
                ['1', 'Analyse your 3 most important pages', 'Run the content analyser on your homepage, best-performing blog post, and top service page. The score breakdown will show you exactly where to focus.'],
                ['2', 'Fix your top 3 issues first', 'Each analysis surfaces a prioritised issue list. Pick the 3 highest-impact fixes and apply them before publishing anything new.'],
              ].map(({ 0: n, 1: title, 2: desc }) => (
                <Section key={n} className="mb-5 flex gap-3">
                  <Text className="m-0 text-sm font-bold text-slate-800">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-black mr-2">{n}</span>
                    {title}
                  </Text>
                  <Text className="m-0 text-sm text-slate-500 mt-1 pl-7">{desc}</Text>
                </Section>
              ))}

              <Hr className="border-slate-100 my-6" />

              <Button
                href={dashboardUrl}
                className="bg-blue-600 text-white font-bold text-sm px-8 py-3 rounded-xl no-underline block text-center mb-4"
              >
                Back to your dashboard →
              </Button>

              {isFree && (
                <Text className="text-center text-xs text-slate-400 mt-3 m-0">
                  Need more? <Link href={pricingUrl} className="text-blue-600 font-semibold">Upgrade to Pro ($19/mo)</Link> for rank tracking, SERP audits and 14 more tools.
                </Text>
              )}
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

export default DripDay7Email
