import {
  Body, Button, Container, Head, Heading, Hr, Html,
  Preview, Section, Text, Tailwind,
} from '@react-email/components'

interface AgencyReportProps {
  clientName: string
  website: string
  monthName: string
  year: number
  reportUrl: string
  trafficChange: number
  backlinksAdded: number
  domainAuthority: number
}

export function AgencyReportEmail({
  clientName,
  website,
  monthName,
  year,
  reportUrl,
  trafficChange,
  backlinksAdded,
  domainAuthority,
}: AgencyReportProps) {
  const trafficUp = trafficChange >= 0

  return (
    <Html>
      <Head />
      <Preview>{`Your ${monthName} ${year} SEO report for ${website} is ready`}</Preview>
      <Tailwind>
        <Body className="bg-slate-50 font-sans">
          <Container className="mx-auto py-12 px-4 max-w-xl">

            <Section className="text-center mb-8">
              <Text className="text-2xl font-black text-slate-900 m-0">◈ Optmizly</Text>
              <Text className="text-sm text-slate-500 m-0">SEO performance report</Text>
            </Section>

            <Section className="bg-white rounded-2xl border border-slate-200 p-8 mb-6">
              <Heading className="text-2xl font-black text-slate-900 mb-2 mt-0">
                Hi {clientName}, your {monthName} report is ready
              </Heading>
              <Text className="text-slate-600 text-base leading-relaxed mb-6">
                Here's a quick look at how <strong>{website}</strong> performed in {monthName} {year}.
              </Text>

              <Section className="bg-slate-50 rounded-xl p-5 mb-6">
                <Text className={`text-3xl font-black m-0 mb-1 ${trafficUp ? 'text-emerald-600' : 'text-red-600'}`}>
                  {trafficUp ? '+' : ''}{trafficChange}%
                </Text>
                <Text className="text-sm text-slate-500 m-0 mb-3">traffic change</Text>
                <Hr className="border-slate-200 my-3" />
                <Text className="text-sm text-slate-700 m-0 mb-1">
                  <strong>{backlinksAdded}</strong> new backlinks added
                </Text>
                <Text className="text-sm text-slate-700 m-0">
                  Domain authority: <strong>{domainAuthority}</strong>
                </Text>
              </Section>

              <Button
                href={reportUrl}
                className="bg-blue-600 text-white font-bold text-sm px-8 py-3 rounded-xl no-underline block text-center"
              >
                View full report →
              </Button>
            </Section>

            <Section className="text-center mt-6">
              <Text className="text-xs text-slate-400 m-0">Optmizly · AI-powered content optimization</Text>
            </Section>

          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}

export default AgencyReportEmail
