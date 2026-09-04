import {
  Html, Head, Preview, Body, Container, Section, Text, Button, Hr,
} from '@react-email/components'

interface ProspectCapacityEmailProps {
  industry: string
  location: string
  searchUrl: string
}

/**
 * Sent when the prospect search that could not run has capacity again.
 *
 * Promises only what is true: capacity is back and the search is ready to run. It does not
 * claim the search was run on their behalf, because it was not — running it would spend
 * from the same ceiling that was exhausted, for someone who may never return.
 */
export function ProspectCapacityEmail({
  industry = 'dental clinics',
  location = 'Coimbatore',
  searchUrl = 'https://optmizly.com/dashboard/tools/client-finder',
}: ProspectCapacityEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{`Your prospect search for ${industry} in ${location} is ready to run`}</Preview>
      <Body style={{ backgroundColor: '#f6f7fb', fontFamily: 'system-ui, -apple-system, sans-serif', margin: 0 }}>
        <Container style={{ maxWidth: '520px', margin: '0 auto', padding: '32px 0' }}>
          <Section style={{ backgroundColor: '#ffffff', borderRadius: '14px', padding: '32px' }}>
            <Text style={{ fontSize: '20px', fontWeight: 700, color: '#0B1120', margin: '0 0 12px' }}>
              Your prospect search is ready
            </Text>

            <Text style={{ fontSize: '15px', lineHeight: 1.6, color: '#4B5563', margin: '0 0 8px' }}>
              You tried to search for <strong>{industry}</strong> in <strong>{location}</strong>{' '}
              while we were at our daily limit for live business data.
            </Text>
            <Text style={{ fontSize: '15px', lineHeight: 1.6, color: '#4B5563', margin: '0 0 24px' }}>
              That limit has reset, so the search will run now.
            </Text>

            <Button
              href={searchUrl}
              style={{
                backgroundColor: '#0000FF', color: '#ffffff', fontWeight: 700, fontSize: '15px',
                padding: '13px 28px', borderRadius: '12px', textDecoration: 'none',
                display: 'block', textAlign: 'center',
              }}
            >
              Run the search
            </Button>

            <Hr style={{ borderColor: '#E8EBF0', margin: '28px 0 18px' }} />

            <Text style={{ fontSize: '13px', lineHeight: 1.6, color: '#8A93A3', margin: 0 }}>
              We cap live business lookups each day so the tool stays fast and free to run.
              You are getting this once, because you asked to be told — there is nothing to
              unsubscribe from.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
