import {
  Body, Button, Container, Head, Heading, Hr, Html,
  Link, Preview, Section, Text, Tailwind,
} from '@react-email/components'

interface WeeklySummaryProps {
  firstName?: string
  dashboardUrl: string
  pricingUrl: string
  // usage
  monthUsed: number
  monthLimit: number
  plan: string
  // this-week activity
  weekAnalyses: number
  bestScore?: number
}

export function WeeklySummaryEmail({
  firstName = 'there',
  dashboardUrl,
  pricingUrl,
  monthUsed,
  monthLimit,
  plan,
  weekAnalyses,
  bestScore,
}: WeeklySummaryProps) {
  const remaining = Math.max(0, monthLimit - monthUsed)
  const usedPct = Math.min(100, Math.round((monthUsed / monthLimit) * 100))
  const isActive = weekAnalyses > 0
  const isLow = remaining <= Math.ceil(monthLimit * 0.1) // ≤10% left
  const isFree = plan === 'FREE'

  const subject = isActive
    ? `Your Optmizly week — ${weekAnalyses} ${weekAnalyses === 1 ? 'analysis' : 'analyses'} run`
    : `You still have ${remaining} free ${remaining === 1 ? 'analysis' : 'analyses'} this month`

  return (
    <Html>
      <Head />
      <Preview>{subject}</Preview>
      <Tailwind>
        <Body className="bg-slate-50 font-sans">
          <Container className="mx-auto py-12 px-4 max-w-xl">

            <Section className="text-center mb-8">
              <Text className="text-2xl font-black text-slate-900 m-0">◈ Optmizly</Text>
              <Text className="text-sm text-slate-500 m-0">Weekly digest</Text>
            </Section>

            <Section className="bg-white rounded-2xl border border-slate-200 p-8 mb-6">
              {isActive ? (
                <>
                  <Heading className="text-2xl font-black text-slate-900 mb-2 mt-0">
                    Nice work this week, {firstName}
                  </Heading>
                  <Text className="text-slate-600 text-base leading-relaxed mb-6">
                    You ran <strong>{weekAnalyses} {weekAnalyses === 1 ? 'analysis' : 'analyses'}</strong> this week.
                    {bestScore != null ? ` Your best content score was ${bestScore}/100.` : ''} Here's where you stand for the month:
                  </Text>
                </>
              ) : (
                <>
                  <Heading className="text-2xl font-black text-slate-900 mb-2 mt-0">
                    Quick win for this week, {firstName}
                  </Heading>
                  <Text className="text-slate-600 text-base leading-relaxed mb-6">
                    You haven't run any analyses this week — but you still have{' '}
                    <strong>{remaining} {remaining === 1 ? 'analysis' : 'analyses'}</strong> left this month.
                    A 30-second content score could surface something worth fixing.
                  </Text>
                </>
              )}

              {/* Monthly progress */}
              <Section className="bg-slate-50 rounded-xl p-5 mb-6">
                <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider m-0 mb-3">
                  Monthly usage — {plan} plan
                </Text>
                <Text className="text-3xl font-black text-slate-900 m-0 mb-1">
                  {monthUsed}<span className="text-lg font-normal text-slate-400">/{monthLimit}</span>
                </Text>
                <Text className="text-sm text-slate-500 m-0 mb-3">analyses used this month</Text>

                {/* Progress bar */}
                <div style={{ background: '#e2e8f0', borderRadius: 999, height: 8, overflow: 'hidden' }}>
                  <div style={{
                    background: isLow ? '#ef4444' : '#0000FF',
                    height: 8,
                    width: `${usedPct}%`,
                    borderRadius: 999,
                  }} />
                </div>

                {isLow && remaining > 0 && (
                  <Text className="text-xs text-red-600 font-semibold mt-2 mb-0">
                    Only {remaining} {remaining === 1 ? 'analysis' : 'analyses'} remaining this month.
                  </Text>
                )}
                {remaining === 0 && (
                  <Text className="text-xs text-red-600 font-semibold mt-2 mb-0">
                    You've used all your analyses this month.
                  </Text>
                )}
              </Section>

              {remaining === 0 && isFree ? (
                <Button
                  href={pricingUrl}
                  className="bg-blue-600 text-white font-bold text-sm px-8 py-3 rounded-xl no-underline block text-center"
                >
                  Upgrade to get 50 analyses/mo →
                </Button>
              ) : (
                <Button
                  href={dashboardUrl}
                  className="bg-blue-600 text-white font-bold text-sm px-8 py-3 rounded-xl no-underline block text-center"
                >
                  {isActive ? 'Keep going →' : 'Run an analysis now →'}
                </Button>
              )}
            </Section>

            {/* Tip card */}
            <Section className="bg-blue-50 rounded-xl border border-blue-100 px-6 py-4 mb-6">
              <Text className="text-sm text-blue-800 m-0">
                <strong>💡 This week's tip:</strong> Run your analysis on a page that{' '}
                <em>already gets traffic</em> — improving a B+ page to an A is faster than building a new one from zero.
              </Text>
            </Section>

            <Hr className="border-slate-100 mb-4" />

            <Section>
              <Text className="text-xs text-slate-500 m-0">
                📖 <strong>From the blog:</strong>{' '}
                <Link href="https://optmizly.com/blog/what-is-content-score" className="text-blue-600">
                  What Is a Content Score and How Do You Improve It? →
                </Link>
              </Text>
            </Section>

            <Section className="text-center mt-6">
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

export default WeeklySummaryEmail
