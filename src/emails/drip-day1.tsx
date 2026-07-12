import {
  Body, Button, Container, Head, Heading, Hr, Html,
  Link, Preview, Section, Text, Tailwind,
} from '@react-email/components'

interface DripDay1Props {
  firstName?: string
  dashboardUrl: string
}

export function DripDay1Email({ firstName = 'there', dashboardUrl }: DripDay1Props) {
  return (
    <Html>
      <Head />
      <Preview>One thing most users miss on their first Optmizly analysis</Preview>
      <Tailwind>
        <Body className="bg-slate-50 font-sans">
          <Container className="mx-auto py-12 px-4 max-w-xl">

            <Section className="text-center mb-8">
              <Text className="text-2xl font-black text-slate-900 m-0">◈ Optmizly</Text>
              <Text className="text-sm text-slate-500 m-0">AI Content Optimizer</Text>
            </Section>

            <Section className="bg-white rounded-2xl border border-slate-200 p-8 mb-6">
              <Heading className="text-2xl font-black text-slate-900 mb-2 mt-0">
                Hey {firstName}, quick tip
              </Heading>
              <Text className="text-slate-600 text-base leading-relaxed mb-4">
                Most users paste content manually. Here's the faster way: <strong>drop a URL into the Fetch &amp; Analyse box</strong> and Optmizly fetches the live page and scores it automatically.
              </Text>
              <Text className="text-slate-600 text-base leading-relaxed mb-6">
                You'll get a score across 8 dimensions in about 30 seconds, from On-Page SEO to LLM Citation potential, with a prioritised fix list at the end.
              </Text>

              <Hr className="border-slate-100 mb-6" />

              <Text className="text-sm font-bold text-slate-800 mb-3">Your 8 content dimensions:</Text>
              {[
                ['📊', 'On-Page SEO', 'Title, headings, keyword usage'],
                ['🤖', 'LLM Citation', 'Whether AI would cite you in answers'],
                ['⭐', 'E-E-A-T Signals', 'Expertise and trust indicators'],
                ['🕳️', 'Entity Optimization', 'Topics and concepts your content covers'],
              ].map(([icon, title, desc]) => (
                <Section key={title} className="mb-2.5">
                  <Text className="m-0 text-sm text-slate-700">
                    <span className="mr-2">{icon}</span>
                    <strong>{title}</strong>: {desc}
                  </Text>
                </Section>
              ))}

              <Hr className="border-slate-100 my-6" />

              <Button
                href={dashboardUrl}
                className="bg-blue-600 text-white font-bold text-sm px-8 py-3 rounded-xl no-underline block text-center"
              >
                Analyse a page now →
              </Button>

              <Hr className="border-slate-100 mt-6 mb-4" />

              <Text className="text-xs text-slate-500 m-0">
                📖 <strong>From the blog:</strong>{' '}
                <Link href="https://optmizly.com/blog/how-to-write-content-that-ranks" className="text-blue-600">
                  How to Write Content That Ranks in 2026 →
                </Link>
              </Text>
            </Section>

            <Section className="bg-blue-50 rounded-xl border border-blue-100 px-6 py-4 mb-6">
              <Text className="text-sm text-blue-800 m-0">
                <strong>💡 Best first analysis:</strong> Run it on your most important page: homepage, a key service page, or your best blog post.
              </Text>
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

export default DripDay1Email
