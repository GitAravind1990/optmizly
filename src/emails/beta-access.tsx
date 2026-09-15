import {
  Body, Button, Container, Head, Heading, Html,
  Preview, Section, Text, Tailwind,
} from '@react-email/components'

interface BetaAccessEmailProps {
  /** The address the access is pinned to. Shown in the email because it is load-bearing:
   *  signing up with a different one silently lands on the Free plan. */
  email: string
  monthlyCredits: number
  signupUrl: string
  replyTo: string
}

/**
 * Sent by hand to a beta tester whose account is pinned in PINNED_ACCOUNTS.
 *
 * Two things in here are not marketing. The address has to be stated, because the pin is
 * matched on it and signing up with a different one gives them the Free plan with nothing
 * explaining why. And the cap has to be explained in credits rather than runs, because ten
 * credits is ten cheap analyses or three expensive ones — a tester who reads "10 analyses"
 * and gets three will reasonably report it as a bug.
 */
export function BetaAccessEmail({
  email,
  monthlyCredits,
  signupUrl,
  replyTo,
}: BetaAccessEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{`Your Optmizly beta access: all 24 tools, ${monthlyCredits} credits a month`}</Preview>
      <Tailwind>
        <Body className="bg-slate-50 font-sans">
          <Container className="mx-auto py-12 px-4 max-w-xl">

            <Section className="text-center mb-8">
              <Text className="text-2xl font-black text-slate-900 m-0">Optmizly</Text>
            </Section>

            <Section className="bg-white rounded-2xl border border-slate-200 p-8 mb-6">
              <Heading className="text-xl font-black text-slate-900 mt-0 mb-2">
                Your beta access is ready
              </Heading>
              <Text className="text-slate-600 text-base leading-relaxed mb-5">
                Thanks for agreeing to test Optmizly. You have the full Agency tool set —
                all 24 tools — with <strong>{monthlyCredits} analysis credits a month</strong>.
                Nothing to pay and no card anywhere.
              </Text>

              <Section className="bg-amber-50 rounded-xl border border-amber-200 p-5 mb-5">
                <Text className="text-amber-900 text-sm font-bold m-0 mb-1">
                  Sign up with this exact address
                </Text>
                <Text className="text-amber-900 text-sm leading-relaxed m-0">
                  <strong>{email}</strong>
                  <br />
                  Your access is attached to it. If you sign up with a different address —
                  or a Google account on a different one — you will land on the free plan
                  with nothing to explain why.
                </Text>
              </Section>

              <Section className="text-center mb-2">
                <Button
                  href={signupUrl}
                  className="bg-blue-600 text-white font-bold px-6 py-3 rounded-xl text-base no-underline"
                >
                  Create your account
                </Button>
              </Section>
            </Section>

            <Section className="bg-white rounded-2xl border border-slate-200 p-8 mb-6">
              <Heading className="text-base font-black text-slate-900 mt-0 mb-2">
                How the {monthlyCredits} credits work
              </Heading>
              <Text className="text-slate-600 text-sm leading-relaxed mb-3">
                Credits are weighted by what a tool costs us to run, so {monthlyCredits} credits
                is not {monthlyCredits} runs of everything. Each tool shows its cost before you
                run it.
              </Text>
              <Text className="text-slate-600 text-sm leading-relaxed m-0 mb-2">
                <strong>1 credit</strong> — most tools, including Content Analyzer, the
                rewriter, E-E-A-T, On-Page SEO and the SEO Audit.
              </Text>
              <Text className="text-slate-600 text-sm leading-relaxed m-0 mb-2">
                <strong>2 credits</strong> — Backlinks, Rank Tracker, SERP Audit, Review
                Velocity, Client Reports, AI Citation Plan, Content Gap, Content Planner.
              </Text>
              <Text className="text-slate-600 text-sm leading-relaxed m-0 mb-3">
                <strong>3 credits</strong> — Keyword Research, Competitor Spy, Ranking
                Engine, Geogrid, AI Visibility and the Local SEO suite. These call live
                search-data providers, which is what makes them cost more.
              </Text>
              <Text className="text-slate-600 text-sm leading-relaxed m-0">
                So {monthlyCredits} credits is about three runs of a heavy tool, or ten of a
                light one. It resets at the start of each month. Two things cost you nothing
                at all: SEO Client Finder has its own separate allowance of 5 searches a day,
                and the free tools at optmizly.com/tools need no credits or account.
              </Text>
            </Section>

            <Section className="bg-white rounded-2xl border border-slate-200 p-8 mb-6">
              <Heading className="text-base font-black text-slate-900 mt-0 mb-2">
                One thing that will look like a bug
              </Heading>
              <Text className="text-slate-600 text-sm leading-relaxed m-0">
                You will hit the credit limit sooner than a paying customer would, and when
                you do the app will email you about it and offer to upgrade you. That is the
                beta cap doing its job, not a fault — ignore the upgrade prompts. If you run
                out and still need more, reply and say so.
              </Text>
            </Section>

            <Section className="bg-white rounded-2xl border border-slate-200 p-8 mb-6">
              <Heading className="text-base font-black text-slate-900 mt-0 mb-2">
                What is most useful to hear
              </Heading>
              <Text className="text-slate-600 text-sm leading-relaxed m-0">
                Anything that was confusing, slow, or wrong — especially a number you did not
                believe. Reply straight to this email ({replyTo}); it goes to a person.
              </Text>
            </Section>

            <Text className="text-slate-400 text-xs text-center leading-relaxed">
              You are getting this because you agreed to test Optmizly. It is a one-off
              message, not a subscription, and there is nothing to unsubscribe from.
            </Text>

          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}
