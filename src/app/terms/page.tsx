import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Terms of Service – Optmizly' }

const sections = [
  {
    title: '1. Acceptance of Terms',
    body: `By creating an account or using Optmizly ("Service"), you agree to these Terms of Service and our Privacy Policy. If you do not agree, do not use the Service. These terms constitute a legally binding agreement between you and Optmizly.`,
  },
  {
    title: '2. Description of Service',
    body: `Optmizly provides AI-powered content analysis and optimisation tools. The Service uses large language models to analyse content and generate recommendations. Results are provided for informational purposes only and do not guarantee specific SEO outcomes. AI-generated recommendations may not always be accurate and should be reviewed before implementation.`,
  },
  {
    title: '3. Account Registration and Plans',
    body: `You must create an account to use Optmizly. You are responsible for maintaining the confidentiality of your login credentials and for all activity under your account. Free accounts are limited to 3 analyses per month. Pro accounts are limited to 50 analyses per month. Agency accounts are limited to 200 analyses per month. Unused analyses do not roll over. We reserve the right to modify plan limits with 30 days' notice.`,
  },
  {
    title: '4. User Obligations',
    body: `You agree to: (a) provide accurate account information; (b) use the Service only for lawful purposes; (c) not share your account credentials with others; (d) not attempt to circumvent usage limits or reverse-engineer the Service; (e) not use automated scripts, bots, or scrapers to abuse the API; (f) not submit content that is illegal, defamatory, or infringes third-party intellectual property rights; (g) not use the Service to generate spam, misinformation, or content that promotes harm. Violation of these obligations may result in immediate account suspension or termination without refund.`,
  },
  {
    title: '5. Payments and Billing',
    body: `Paid plans are billed monthly or annually via Lemon Squeezy. By subscribing, you authorise recurring charges to your payment method. All prices are in USD. Taxes may apply depending on your location and will be added at checkout. Subscriptions auto-renew at the end of each billing period. You may cancel at any time – you retain access to paid features until the end of your current billing period. No partial refunds are issued for unused time within a billing period, except as outlined in our Refund Policy.`,
  },
  {
    title: '6. Refund Policy',
    body: `We offer a 14-day money-back guarantee for all new paid subscriptions. If you are not satisfied within 14 days of your first payment, contact us at support@Optmizly.com for a full refund. After 14 days, all payments are non-refundable except where required by applicable law. Annual plans that have received a refund are not eligible for a second refund on a new subscription. See our full Refund Policy at /refund-policy.`,
  },
  {
    title: '7. Intellectual Property',
    body: `You retain full ownership of all content you submit for analysis. Optmizly does not claim any rights over your content. By submitting content, you grant Optmizly a limited, non-exclusive licence to process it solely for the purpose of providing the Service. The Optmizly platform, interface, branding, and codebase are proprietary and protected by copyright and other intellectual property laws. You may not copy, reproduce, modify, or distribute any part of the platform without our prior written consent.`,
  },
  {
    title: '8. Disclaimer of Warranties',
    body: `The Service is provided "as is" and "as available" without warranties of any kind, express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, or non-infringement. We do not warrant that the Service will be uninterrupted, error-free, or that any specific SEO results will be achieved. AI-generated content is inherently probabilistic and may contain errors.`,
  },
  {
    title: '9. Limitation of Liability',
    body: `To the maximum extent permitted by applicable law, Optmizly and its officers, employees, and affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages – including loss of profits, data, business, or goodwill – arising from your use of or inability to use the Service, even if we have been advised of the possibility of such damages. Our total cumulative liability for any claims arising from these terms shall not exceed the greater of (a) the total amount you paid to Optmizly in the 3 months preceding the claim or (b) USD $50.`,
  },
  {
    title: '10. Indemnification',
    body: `You agree to indemnify and hold harmless Optmizly and its affiliates from any claims, losses, damages, and expenses (including reasonable legal fees) arising from your use of the Service, your violation of these Terms, or your infringement of any third-party rights.`,
  },
  {
    title: '11. Termination',
    body: `We may suspend or terminate your account at any time for violation of these Terms, fraudulent activity, or for any other reason with or without notice. Upon termination, your right to use the Service ceases immediately. You may delete your account at any time from account settings. Termination does not entitle you to a refund except as provided under our Refund Policy.`,
  },
  {
    title: '12. Changes to Terms',
    body: `We may update these Terms at any time. We will notify you by email at least 14 days before material changes take effect. Continued use of the Service after changes constitutes acceptance of the revised Terms. If you do not agree with changes, you may cancel your subscription before they take effect.`,
  },
  {
    title: '13. Governing Law',
    body: `These Terms are governed by applicable law. Disputes will be resolved through good-faith negotiation first. If unresolved, disputes shall be submitted to binding arbitration where permitted by law. Nothing in these Terms limits your rights under applicable consumer protection laws in your jurisdiction.`,
  },
  {
    title: '14. Contact',
    body: `For questions about these Terms, contact us at legal@Optmizly.com.`,
  },
]

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-slate-200 px-6 h-14 flex items-center gap-4">
        <Link href="/" className="font-extrabold text-slate-900">◈ Optmizly</Link>
        <div className="flex-1" />
        <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-900">Dashboard</Link>
      </nav>

      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-4xl font-black mb-2">Terms of Service</h1>
        <p className="text-slate-400 text-sm mb-12">Last updated: April 2025</p>

        {sections.map(s => (
          <section key={s.title} className="mb-10">
            <h2 className="text-lg font-bold mb-3">{s.title}</h2>
            <p className="text-slate-600 leading-relaxed">{s.body}</p>
          </section>
        ))}

        <div className="border-t border-slate-200 pt-8 flex gap-6 text-sm text-slate-400">
          <Link href="/privacy" className="hover:text-slate-700">Privacy Policy</Link>
          <Link href="/refund-policy" className="hover:text-slate-700">Refund Policy</Link>
        </div>
      </div>
    </div>
  )
}

