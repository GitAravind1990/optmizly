import Link from 'next/link'
import type { Metadata } from 'next'
import { PageHeader } from '@/components/page-header'

export const metadata: Metadata = { title: 'Refund Policy – Optmizly' }

const sections = [
  {
    title: '1. 14-Day Money-Back Guarantee',
    body: `We offer a 14-day money-back guarantee on all new paid subscriptions (Pro and Agency plans). If you are not satisfied with Optmizly for any reason within 14 days of your first payment, contact us at support@Optmizly.com and we will issue a full refund – no questions asked. The 14-day window begins on the date of your first payment.`,
  },
  {
    title: '2. Eligibility',
    body: `To be eligible for a refund under the money-back guarantee: (a) the refund request must be submitted within 14 days of your first payment; (b) you must not have previously received a refund for a Optmizly subscription; (c) your account must not have been terminated for a violation of our Terms of Service. Annual plan upgrades and plan changes within an existing subscription are assessed on a case-by-case basis.`,
  },
  {
    title: '3. How to Request a Refund',
    body: `To request a refund, email us at support@Optmizly.com with the subject line "Refund Request" and include: your registered email address, the date of your payment, and a brief reason for the refund (optional but appreciated). We aim to process all eligible refund requests within 3–5 business days. Refunds are returned to the original payment method. Depending on your bank or card issuer, it may take an additional 5–10 business days for the funds to appear.`,
  },
  {
    title: '4. Renewals',
    body: `The 14-day money-back guarantee applies to the first payment only and does not apply to subsequent renewal charges. If you do not wish to be charged for a renewal, you must cancel your subscription before the renewal date. You can cancel at any time from your account settings – cancellation takes effect at the end of the current billing period and you retain access to paid features until then.`,
  },
  {
    title: '5. Non-Refundable Situations',
    body: `We are unable to offer refunds in the following circumstances: (a) refund requests made more than 14 days after the first payment; (b) accounts that have already received a refund under the money-back guarantee; (c) accounts terminated for violation of our Terms of Service; (d) charges for periods already consumed beyond the 14-day window; (e) one-time purchases or add-ons (if offered in the future). We reserve the right to decline refund requests that appear to be made in bad faith or to abuse the guarantee.`,
  },
  {
    title: '6. Chargebacks',
    body: `We ask that you contact us at support@Optmizly.com before initiating a chargeback with your bank or card issuer. Chargebacks are costly and time-consuming for both parties. If a chargeback is filed without prior contact, we reserve the right to suspend your account pending resolution and to contest the chargeback. Fraudulent chargebacks may result in permanent account termination.`,
  },
  {
    title: '7. Consumer Rights',
    body: `Nothing in this Refund Policy limits your statutory rights under applicable consumer protection law. If you are based in the EU or UK, you may have additional rights under the Consumer Rights Directive or Consumer Contracts Regulations, including a statutory 14-day cooling-off period for digital services. If you have begun using the Service within the cooling-off period and you subsequently request a cancellation, a proportional deduction may apply under applicable law.`,
  },
  {
    title: '8. Contact',
    body: `For refund requests or billing questions, contact us at support@Optmizly.com. We aim to respond within 1 business day.`,
  },
]

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      <PageHeader />

      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-4xl font-black mb-2">Refund Policy</h1>
        <p className="text-slate-400 text-sm mb-4">Last updated: April 2025</p>

        <div className="bg-green-50 border border-green-200 rounded-xl px-6 py-4 mb-12">
          <p className="text-green-800 font-semibold text-sm">
            14-Day Money-Back Guarantee – If you&apos;re not satisfied within 14 days of your first payment, we&apos;ll refund you in full. No questions asked.
          </p>
        </div>

        {sections.map(s => (
          <section key={s.title} className="mb-10">
            <h2 className="text-lg font-bold mb-3">{s.title}</h2>
            <p className="text-slate-600 leading-relaxed">{s.body}</p>
          </section>
        ))}

        <div className="border-t border-slate-200 pt-8 flex gap-6 text-sm text-slate-400">
          <Link href="/terms" className="hover:text-slate-700">Terms of Service</Link>
          <Link href="/privacy" className="hover:text-slate-700">Privacy Policy</Link>
        </div>
      </div>
    </div>
  )
}

