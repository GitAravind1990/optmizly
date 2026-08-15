import Link from 'next/link'
import type { Metadata } from 'next'
import { PageHeader } from '@/components/page-header'

export const metadata: Metadata = { title: 'Privacy Policy – Optmizly' }

const sections = [
  {
    title: '1. Who We Are',
    body: `Optmizly ("we", "us", "our") operates the Optmizly platform at Optmizly.com. We are the data controller for personal data collected through the Service. For privacy enquiries, contact us at privacy@Optmizly.com.`,
  },
  {
    title: '2. Information We Collect',
    body: `Account data: When you register, we collect your name and email address via Clerk (our authentication provider). Payment data: When you subscribe to a paid plan, your payment information is processed by DoDo Payments. We never see or store your card details. Usage data: We record the number of analyses you run each month to enforce plan limits. Analysis data: Content, URLs and domains you submit are sent to our AI provider and to the SEO data providers listed in section 5 to generate results. AI processing is currently performed by Groq; we may use Anthropic instead, and section 5 names both. Results, along with a snippet of the submitted content and any URL analysed, are stored against your account so you can revisit them in your analysis history, and are deleted when you delete the analysis or your account. Connected-service data: If you connect Google Search Console, we retrieve and store search performance data for your properties – see section 6. Technical data: We may collect standard server logs including IP addresses and browser user-agent strings for security and diagnostics.

Free tools used without an account: Some tools, such as the AI Regex Generator, can be used without registering. When you use one, a sample of the data you paste – up to 15 lines, each truncated to 120 characters – is sent to our AI provider as context; the rest is processed on our own servers and is not sent anywhere. Nothing you submit through these tools is stored: there is no account to store it against, no record is written to our database, and it is not used to train any model. To cap abuse and cost we keep a request counter in our rate-limiting store keyed to your IP address, which expires automatically within 26 hours and is not linked to any account or used for any other purpose.`,
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
    body: `We share data with the following sub-processors to operate the Service: Clerk (authentication and user management), Supabase/PostgreSQL (database), DoDo Payments (payment processing), Groq (AI analysis – our current AI provider; content you submit is processed under Groq's API terms), Anthropic (alternative AI provider, used when configured, under Anthropic's API terms), Resend (transactional email), Vercel (hosting and edge functions), PostHog (product analytics and error monitoring), DataForSEO and OpenPageRank (keyword, ranking, backlink and domain metrics – we send the keywords, domains and URLs you analyse), and Google (Search Console, PageSpeed Insights and Maps/Places APIs, used to retrieve performance and location data for the sites you analyse or connect). Each service operates under its own privacy policy and data processing agreements. Please review Groq's privacy policy at groq.com and Anthropic's at anthropic.com.`,
  },
  {
    title: '6. Google User Data (Search Console Integration)',
    body: `Optmizly offers an optional integration with Google Search Console. It is never enabled by default – it applies only if you explicitly connect your Google account from Settings → Integrations.

What we access: we request the read-only scope https://www.googleapis.com/auth/webmasters.readonly. This grants us permission to read, and never to modify, your Search Console data. We retrieve (a) the list of Search Console properties your Google account can access, and (b) search performance rows for the properties you sync, consisting of the search query, date, country, device, impressions, clicks, click-through rate and average position.

How we use it: this data is used solely to show you your own search performance inside Optmizly, and to improve the accuracy of the keyword, difficulty and ranking estimates the Service presents to you. It is Google's own measurement of how your site performs, and we use it to check and calibrate estimates that would otherwise come from third-party vendors.

How we store it: OAuth access and refresh tokens are encrypted at rest using AES-256-GCM and are used only to call the Google Search Console API on your behalf. Retrieved search performance rows are stored in our database against your account.

What we do not do: we do not sell this data, share it with third parties, use it for advertising, use it to train artificial intelligence or machine learning models, or make it available to other Optmizly users. Optmizly's use and transfer of information received from Google APIs adheres to the Google API Services User Data Policy, including the Limited Use requirements.

Revoking access: you can disconnect at any time from Settings → Integrations, which revokes our token with Google and deletes it from our systems, or from your Google Account permissions page at myaccount.google.com/permissions. Disconnecting stops all further collection. Search performance data already retrieved remains stored against your account until you delete your account or ask us to remove it at privacy@Optmizly.com, at which point it is deleted.`,
  },
  {
    title: '7. International Data Transfers',
    body: `Our infrastructure is primarily hosted in the United States. If you are based in the EEA or UK, your data may be transferred to and processed in the US. Where required, such transfers are governed by Standard Contractual Clauses (SCCs) or other approved safeguards under GDPR Chapter V.`,
  },
  {
    title: '8. Data Retention',
    body: `We retain your account data (email, plan, usage counts) for as long as your account is active. Saved analyses, projects and any search performance data retrieved from a connected Google Search Console account are retained while your account is active, so that historical comparisons remain available to you. If you delete your account, all of this personal data is removed from our systems within 30 days, except where retention is required by law. Monthly usage counts are reset each calendar month. Server logs are retained for up to 90 days. Rate-limiting counters for tools used without an account contain an IP address and expire automatically within 26 hours; data submitted to those tools is never stored.`,
  },
  {
    title: '9. Cookies',
    body: `We use session cookies for authentication, managed by Clerk. These are strictly necessary for the Service to function. We do not use advertising or tracking cookies. You can control cookies through your browser settings, but disabling session cookies will prevent you from logging in.`,
  },
  {
    title: '10. Your Rights',
    body: `Depending on your location, you may have the following rights regarding your personal data: Access – request a copy of the data we hold about you. Rectification – request correction of inaccurate data. Erasure ("right to be forgotten") – request deletion of your data. Restriction – request that we limit how we process your data. Portability – receive your data in a structured, machine-readable format. Objection – object to processing based on legitimate interests. Withdrawal of consent – where processing is based on consent, withdraw it at any time. To exercise any of these rights, contact us at privacy@Optmizly.com. We will respond within 30 days. EEA/UK users also have the right to lodge a complaint with their local supervisory authority.`,
  },
  {
    title: '11. Children\'s Privacy',
    body: `The Service is not directed at children under the age of 16. We do not knowingly collect personal data from children. If you believe we have inadvertently collected data from a child, contact us at privacy@Optmizly.com and we will delete it promptly.`,
  },
  {
    title: '12. Security',
    body: `We implement industry-standard technical and organisational measures to protect your data. Passwords are managed by Clerk and are never stored by Optmizly directly. All data is transmitted over HTTPS/TLS. Payment information is handled entirely by DoDo Payments and is never stored on our servers. Credentials for connected third-party accounts, such as Google Search Console OAuth tokens, are encrypted at rest using AES-256-GCM. Despite these measures, no internet transmission is 100% secure and we cannot guarantee absolute security.`,
  },
  {
    title: '13. Changes to This Policy',
    body: `We may update this Privacy Policy from time to time. We will notify you by email for material changes and update the "Last updated" date above. Continued use of the Service after changes constitutes acceptance of the revised Policy.`,
  },
  {
    title: '14. Contact',
    body: `For privacy-related questions or to exercise your rights, contact us at privacy@Optmizly.com. We aim to respond to all requests within 30 days.`,
  },
]

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <PageHeader />

      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-4xl font-black mb-2">Privacy Policy</h1>
        <p className="text-slate-400 text-sm mb-12">Last updated: August 2026</p>

        {sections.map(s => (
          <section key={s.title} className="mb-10">
            <h2 className="text-lg font-bold mb-3">{s.title}</h2>
            {/* Split on blank lines so a long section reads as paragraphs rather than one
                block — HTML collapses the newlines in the source string otherwise. */}
            {s.body.split('\n\n').map((para, i) => (
              <p key={i} className="text-slate-600 leading-relaxed mb-3 last:mb-0">{para.trim()}</p>
            ))}
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

