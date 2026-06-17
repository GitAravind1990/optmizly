import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Privacy Policy – Optmizly' }

const sections = [
  {
    title: '1. Who We Are',
    body: `Optmizly ("we", "us", "our") operates the Optmizly platform at Optmizly.com. We are the data controller for personal data collected through the Service. For privacy enquiries, contact us at privacy@Optmizly.com.`,
  },
  {
    title: '2. Information We Collect',
    body: `Account data: When you register, we collect your name and email address via Clerk (our authentication provider). Payment data: When you subscribe to a paid plan, your payment information is processed by Lemon Squeezy. We never see or store your card details. Usage data: We record the number of analyses you run each month to enforce plan limits. We do not store the content you submit for analysis – it is sent to the Anthropic API to generate results and is not retained on our servers or databases. Technical data: We may collect standard server logs including IP addresses and browser user-agent strings for security and diagnostics.`,
  },
  {
    title: '3. How We Use Your Information',
    body: `We use your data to: (a) provide and maintain the Service; (b) enforce monthly usage limits; (c) send transactional emails (account confirmation, subscription receipts, password resets); (d) detect fraud and abuse; (e) comply with legal obligations. We do not use your data for advertising. We do not sell, rent, or share your personal data with third parties for marketing purposes.`,
  },
  {
    title: '4. Legal Basis for Processing (GDPR)',
    body: `If you are located in the European Economic Area (EEA) or UK, we process your personal data under the following legal bases: Contract performance – processing necessary to provide the Service you have subscribed to. Legitimate interests – security monitoring, fraud prevention, and product improvement, where these do not override your rights. Legal obligation – where we are required to retain or disclose data by law. Consent – where we ask for your explicit consent (e.g. optional marketing emails).`,
  },
  {
    title: '5. Third-Party Services',
    body: `We share data with the following sub-processors to operate the Service: Clerk (authentication and user management), Supabase/PostgreSQL (database), Lemon Squeezy (payment processing), Anthropic (AI analysis – content you submit is processed under Anthropic's API terms), Resend (transactional email), and Vercel (hosting and edge functions). Each service operates under its own privacy policy and data processing agreements. Content submitted for analysis is processed by Anthropic's API. Please review Anthropic's privacy policy at anthropic.com.`,
  },
  {
    title: '6. International Data Transfers',
    body: `Our infrastructure is primarily hosted in the United States. If you are based in the EEA or UK, your data may be transferred to and processed in the US. Where required, such transfers are governed by Standard Contractual Clauses (SCCs) or other approved safeguards under GDPR Chapter V.`,
  },
  {
    title: '7. Data Retention',
    body: `We retain your account data (email, plan, usage counts) for as long as your account is active. If you delete your account, your personal data is removed from our systems within 30 days, except where retention is required by law. Monthly usage counts are reset each calendar month. Server logs are retained for up to 90 days.`,
  },
  {
    title: '8. Cookies',
    body: `We use session cookies for authentication, managed by Clerk. These are strictly necessary for the Service to function. We do not use advertising or tracking cookies. You can control cookies through your browser settings, but disabling session cookies will prevent you from logging in.`,
  },
  {
    title: '9. Your Rights',
    body: `Depending on your location, you may have the following rights regarding your personal data: Access – request a copy of the data we hold about you. Rectification – request correction of inaccurate data. Erasure ("right to be forgotten") – request deletion of your data. Restriction – request that we limit how we process your data. Portability – receive your data in a structured, machine-readable format. Objection – object to processing based on legitimate interests. Withdrawal of consent – where processing is based on consent, withdraw it at any time. To exercise any of these rights, contact us at privacy@Optmizly.com. We will respond within 30 days. EEA/UK users also have the right to lodge a complaint with their local supervisory authority.`,
  },
  {
    title: '10. Children\'s Privacy',
    body: `The Service is not directed at children under the age of 16. We do not knowingly collect personal data from children. If you believe we have inadvertently collected data from a child, contact us at privacy@Optmizly.com and we will delete it promptly.`,
  },
  {
    title: '11. Security',
    body: `We implement industry-standard technical and organisational measures to protect your data. Passwords are managed by Clerk and are never stored by Optmizly directly. All data is transmitted over HTTPS/TLS. Payment information is handled entirely by Lemon Squeezy and is never stored on our servers. Despite these measures, no internet transmission is 100% secure and we cannot guarantee absolute security.`,
  },
  {
    title: '12. Changes to This Policy',
    body: `We may update this Privacy Policy from time to time. We will notify you by email for material changes and update the "Last updated" date above. Continued use of the Service after changes constitutes acceptance of the revised Policy.`,
  },
  {
    title: '13. Contact',
    body: `For privacy-related questions or to exercise your rights, contact us at privacy@Optmizly.com. We aim to respond to all requests within 30 days.`,
  },
]

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-slate-200 px-6 h-14 flex items-center gap-4">
        <Link href="/" className="font-extrabold text-slate-900">◈ Optmizly</Link>
        <div className="flex-1" />
        <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-900">Dashboard</Link>
      </nav>

      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-4xl font-black mb-2">Privacy Policy</h1>
        <p className="text-slate-400 text-sm mb-12">Last updated: April 2025</p>

        {sections.map(s => (
          <section key={s.title} className="mb-10">
            <h2 className="text-lg font-bold mb-3">{s.title}</h2>
            <p className="text-slate-600 leading-relaxed">{s.body}</p>
          </section>
        ))}

        <div className="border-t border-slate-200 pt-8 flex gap-6 text-sm text-slate-400">
          <Link href="/terms" className="hover:text-slate-700">Terms of Service</Link>
          <Link href="/refund-policy" className="hover:text-slate-700">Refund Policy</Link>
        </div>
      </div>
    </div>
  )
}

