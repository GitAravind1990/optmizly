import {
  Body, Container, Head, Heading, Html, Link, Preview, Section, Text,
} from '@react-email/components'

interface Props {
  firstName?: string
  latestPostTitle?: string
  latestPostUrl?: string
}

export function BlogSubscribeEmail({ firstName, latestPostTitle, latestPostUrl }: Props) {
  const name = firstName?.trim() || 'there'
  return (
    <Html>
      <Head />
      <Preview>You're subscribed to weekly SEO insights from Optmizly</Preview>
      <Body style={{ backgroundColor: '#f8fafc', fontFamily: 'system-ui, sans-serif', margin: 0, padding: '40px 0' }}>
        <Container style={{ maxWidth: '560px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '16px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
          <Section style={{ backgroundColor: '#0000FF', padding: '28px 36px' }}>
            <Text style={{ color: '#ffffff', fontSize: '18px', fontWeight: '800', margin: 0, letterSpacing: '-0.02em' }}>optmizly</Text>
          </Section>
          <Section style={{ padding: '36px' }}>
            <Heading style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: '0 0 12px', letterSpacing: '-0.02em' }}>
              You're in, {name}!
            </Heading>
            <Text style={{ color: '#64748b', fontSize: '15px', lineHeight: '1.6', margin: '0 0 24px' }}>
              Thanks for subscribing. You'll get practical, no-fluff SEO tips covering content optimisation, E-E-A-T, AI search, and more, straight to your inbox.
            </Text>

            {latestPostTitle && latestPostUrl && (
              <Section style={{ backgroundColor: '#f8fafc', borderRadius: '12px', padding: '20px 24px', marginBottom: '24px' }}>
                <Text style={{ color: '#94a3b8', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>
                  Start here
                </Text>
                <Link href={latestPostUrl} style={{ color: '#0f172a', fontSize: '15px', fontWeight: '700', textDecoration: 'none', lineHeight: '1.4' }}>
                  {latestPostTitle} →
                </Link>
              </Section>
            )}

            <Text style={{ color: '#64748b', fontSize: '14px', lineHeight: '1.6', margin: '0 0 24px' }}>
              While you're here, Optmizly's free plan lets you run 3 content analyses per month. No credit card required.
            </Text>

            <Link
              href="https://optmizly.com/signup"
              style={{ display: 'inline-block', backgroundColor: '#0000FF', color: '#ffffff', fontSize: '14px', fontWeight: '700', padding: '12px 24px', borderRadius: '100px', textDecoration: 'none' }}
            >
              Try Optmizly Free →
            </Link>
          </Section>
          <Section style={{ borderTop: '1px solid #f1f5f9', padding: '20px 36px' }}>
            <Text style={{ color: '#cbd5e1', fontSize: '12px', margin: 0 }}>
              Optmizly · <Link href="https://optmizly.com/blog" style={{ color: '#cbd5e1' }}>Blog</Link> · <Link href="https://optmizly.com/privacy" style={{ color: '#cbd5e1' }}>Privacy</Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
