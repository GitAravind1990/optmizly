import Link from 'next/link'
import type { Metadata } from 'next'
import { PageHeader } from '@/components/page-header'

export const metadata: Metadata = { title: 'Refund Policy – Optmizly' }

const sections = [
  {
    title: '1. How the Free Trial Works',
    body: `Pro and Agency plans include a 7-day free trial. A payment method is required to start the trial, but you will not be charged until the trial period ends. You have full access to your plan's features for the entire trial.`,
  },
  {
    title: '2. Cancelling During Your Trial',
    body: `You may cancel at any time during your 7-day trial from your account settings. If you cancel before the trial ends, you will not be charged. Your access continues until the end of the trial period even after cancelling.`,
  },
  {
    title: '3. After Your Trial Converts to a Paid Subscription',
    body: `If you do not cancel before your trial ends, your payment method will be automatically charged for the plan you selected, and your subscription will continue on a recurring monthly basis. Charges after your trial converts are non-refundable except where required by applicable law or as described below.`,
  },
  {
    title: '4. Renewals',
    body: `Subscriptions automatically renew at the end of each billing period. If you do not wish to be charged for a renewal, you must cancel before the renewal date. Cancelling takes effect at the end of your current billing period, and you retain access to paid features until then. No partial refunds are issued for unused time within a billing period.`,
  },
  {
    title: '5. Billing Errors',
    body: `If you believe you were charged in error – for example, a duplicate charge, or a charge after you cancelled – contact us at support@Optmizly.com with your registered email address and the date of the charge. We will investigate and issue a refund if a billing error is confirmed. We aim to process confirmed refunds within 3–5 business days; depending on your bank or card issuer, it may take an additional 5–10 business days for funds to appear.`,
  },
  {
    title: '6. Chargebacks',
    body: `We ask that you contact us at support@Optmizly.com before initiating a chargeback with your bank or card issuer. Chargebacks are costly and time-consuming for both parties. If a chargeback is filed without prior contact, we reserve the right to suspend your account pending resolution and to contest the chargeback. Fraudulent chargebacks may result in permanent account termination.`,
  },
  {
    title: '7. Consumer Rights',
    body: `Nothing in this Refund Policy limits your statutory rights under applicable consumer protection law. If you are based in the EU or UK, you may have additional rights under the Consumer Rights Directive or Consumer Contracts Regulations, including a statutory cooling-off period for digital services. If you have begun using the Service and subsequently request a cancellation, a proportional deduction may apply under applicable law.`,
  },
  {
    title: '8. Contact',
    body: `For billing questions or refund requests, contact us at support@Optmizly.com. We aim to respond within 1 business day.`,
  },
]

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      <PageHeader />

      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-4xl font-black mb-2">Refund Policy</h1>
        <p className="text-slate-400 text-sm mb-4">Last updated: July 2026</p>

        <div className="bg-blue-50 border border-blue-200 rounded-xl px-6 py-4 mb-12">
          <p className="text-blue-800 font-semibold text-sm">
            7-Day Free Trial – Try Pro or Agency free for 7 days. Cancel anytime before your trial ends and you won&apos;t be charged.
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
