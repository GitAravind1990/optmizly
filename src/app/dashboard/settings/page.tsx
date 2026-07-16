'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { UserButton, useUser } from '@clerk/nextjs'
import { Card, Badge, Button, Spinner, ScoreBar } from '@/components/ui'

type GSCStatus = {
  connected: boolean
  sites?: { siteUrl: string; permissionLevel: string }[] | null
  connectedAt?: string
}

const GSC_ERROR_MESSAGES: Record<string, string> = {
  denied: 'You cancelled the Search Console connection.',
  invalid_state: 'Something went wrong verifying the request. Please try connecting again.',
  missing_code: 'Google did not return an authorization code. Please try again.',
  exchange_failed: 'Could not complete the connection with Google. Please try again.',
  not_configured: 'Search Console connection is not configured yet.',
  plan: 'Search Console requires the Agency plan.',
}

type UsageData = {
  plan: string; count: number; limit: number; remaining: number
  subscription?: {
    dodoSubscriptionId: string; status: string
    currentPeriodEnd?: string; cancelledAt?: string; plan: string
  } | null
}

const PLAN_META: Record<string, { label: string; color: 'blue'|'amber'|'gray'; price: string; limit: number; bg: string }> = {
  FREE:   { label: 'Free',   color: 'gray',  price: '$0/mo',  limit: 3,   bg: 'from-slate-700 to-slate-600' },
  PRO:    { label: 'Pro',    color: 'blue',  price: '$19/mo', limit: 50,  bg: 'from-blue-700 to-blue-500' },
  AGENCY: { label: 'Agency', color: 'amber', price: '$49/mo', limit: 200, bg: 'from-amber-600 to-amber-500' },
}

const ALL_TOOLS = [
  { label: 'Content Analyzer',  plans: ['FREE','PRO','AGENCY'] },
  { label: 'Issues Audit',      plans: ['FREE','PRO','AGENCY'] },
  { label: 'Content Optimizer', plans: ['PRO','AGENCY'] },
  { label: 'More tools coming soon', plans: ['AGENCY'] },
]

type Tab = 'account' | 'plan' | 'billing' | 'integrations'

export default function SettingsPage() {
  const { user } = useUser()
  const searchParams = useSearchParams()
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [portalLoading, setPortalLoading] = useState(false)
  const [tab, setTab] = useState<Tab>('account')
  const [copied, setCopied] = useState(false)

  const [gscStatus, setGscStatus] = useState<GSCStatus | null>(null)
  const [gscLoading, setGscLoading] = useState(false)
  const [gscDisconnecting, setGscDisconnecting] = useState(false)
  const [gscBanner, setGscBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    fetch('/api/user').then(r => r.json()).then(d => { setUsage(d); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  // Land on the Integrations tab and show a status banner when redirected back from
  // the Search Console OAuth callback (?tab=integrations&connected=1 or &error=...)
  useEffect(() => {
    if (searchParams.get('tab') === 'integrations') setTab('integrations')
    if (searchParams.get('connected') === '1') {
      setGscBanner({ type: 'success', message: 'Search Console connected successfully.' })
    } else {
      const code = searchParams.get('error')
      if (code) setGscBanner({ type: 'error', message: GSC_ERROR_MESSAGES[code] ?? 'Could not connect Search Console. Please try again.' })
    }
  }, [searchParams])

  const plan = usage?.plan ?? 'FREE'

  useEffect(() => {
    if (!loading && tab === 'integrations' && plan === 'AGENCY' && !gscStatus && !gscLoading) {
      setGscLoading(true)
      fetch('/api/integrations/search-console')
        .then(r => r.json())
        .then(d => setGscStatus(d.data))
        .catch(() => setGscStatus({ connected: false }))
        .finally(() => setGscLoading(false))
    }
  }, [loading, tab, plan, gscStatus, gscLoading])

  async function disconnectGsc() {
    setGscDisconnecting(true)
    try {
      await fetch('/api/integrations/search-console', { method: 'DELETE' })
      setGscStatus({ connected: false })
    } finally {
      setGscDisconnecting(false)
    }
  }

  async function openPortal() {
    setPortalLoading(true)
    try {
      const r = await fetch('/api/portal', { method: 'POST' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      window.open(d.url, '_blank')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not open billing portal')
    } finally { setPortalLoading(false) }
  }

  function copyEmail() {
    const email = user?.emailAddresses[0]?.emailAddress ?? ''
    navigator.clipboard.writeText(email).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  const meta = PLAN_META[plan] ?? PLAN_META.FREE
  const pct = usage ? Math.min(100, (usage.count / usage.limit) * 100) : 0
  const sub = usage?.subscription
  const isActive = sub?.status === 'ACTIVE' || sub?.status === 'TRIALING'
  const nextBilling = sub?.currentPeriodEnd
    ? new Date(sub.currentPeriodEnd).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null

  const avatar = user?.firstName?.[0] ?? user?.emailAddresses[0]?.emailAddress?.[0]?.toUpperCase() ?? '?'

  const TABS: { id: Tab; label: string }[] = [
    { id: 'account',      label: 'Account' },
    { id: 'plan',         label: 'Plan & Usage' },
    { id: 'billing',      label: 'Billing' },
    { id: 'integrations', label: 'Integrations' },
  ]

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 bg-slate-50">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-4 mb-6 bg-white rounded-2xl border border-slate-200 p-5">
          <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${meta.bg} flex items-center justify-center text-white font-black text-lg flex-shrink-0`}>
            {avatar}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-black text-slate-900 text-base truncate">{user?.fullName ?? 'Your Account'}</div>
            <div className="text-xs text-slate-400 truncate">{user?.emailAddresses[0]?.emailAddress}</div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge variant={meta.color}>{meta.label}</Badge>
            <UserButton />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 bg-white rounded-xl border border-slate-200 p-1">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                tab === t.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        )}

        {/* â"€â"€ ACCOUNT TAB â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
        {!loading && tab === 'account' && (
          <div className="space-y-4">

            <Card>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Profile</div>
              {[
                { label: 'Full name',     value: user?.fullName ?? '—',                         action: null },
                { label: 'Email',         value: user?.emailAddresses[0]?.emailAddress ?? '—', action: { label: copied ? '✔ Copied' : 'Copy', fn: copyEmail } },
                { label: 'Member since',  value: user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—', action: null },
                { label: 'Sign-in method',value: user?.externalAccounts[0]?.provider?.replace('_', ' ') ?? 'Email & password', action: null },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
                  <div>
                    <div className="text-xs text-slate-400 mb-0.5">{row.label}</div>
                    <div className="text-sm font-medium capitalize">{row.value}</div>
                  </div>
                  {row.action && (
                    <button onClick={row.action.fn} className="text-xs text-blue-600 hover:underline font-medium flex-shrink-0 ml-4">
                      {row.action.label}
                    </button>
                  )}
                </div>
              ))}
            </Card>

            <Card>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Security</div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <div>
                  <div className="text-sm font-medium">Password</div>
                  <div className="text-xs text-slate-400">Managed via Clerk. Click your avatar to update</div>
                </div>
                <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">Protected</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <div className="text-sm font-medium">Two-factor authentication</div>
                  <div className="text-xs text-slate-400">Extra security for your account</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${
                  user?.twoFactorEnabled
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}>
                  {user?.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </Card>

            <Card className="border-red-100">
              <div className="text-xs font-bold text-red-400 uppercase tracking-wider mb-3">Danger Zone</div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Delete account</div>
                  <div className="text-xs text-slate-400">Permanently remove your account and all data</div>
                </div>
                <a href="mailto:support@Optmizly.com?subject=Delete my account"
                  className="text-xs text-red-500 hover:text-red-700 font-bold border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
                  Request →
                </a>
              </div>
            </Card>
          </div>
        )}

        {/* â"€â"€ PLAN & USAGE TAB â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
        {!loading && tab === 'plan' && (
          <div className="space-y-4">

            {/* Plan hero */}
            <div className={`rounded-2xl p-6 text-white bg-gradient-to-r ${meta.bg}`}>
              <div className="flex items-start justify-between mb-5">
                <div>
                  <div className="text-xs font-bold opacity-60 uppercase tracking-wider mb-1">Current Plan</div>
                  <div className="text-4xl font-black">{meta.label}</div>
                  <div className="text-sm opacity-75 mt-1">{meta.price} · {meta.limit} analyses / month</div>
                </div>
                {plan !== 'AGENCY' && (
                  <Link href="/pricing"
                    className="bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors whitespace-nowrap">
                    Upgrade →
                  </Link>
                )}
              </div>

              {/* Usage */}
              {usage && (
                <div>
                  <div className="flex justify-between text-xs mb-2">
                    <span className="opacity-75">This month's usage</span>
                    <span className="font-black">{usage.count} / {usage.limit}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-white/20 overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${pct >= 90 ? 'bg-red-400' : 'bg-white'}`}
                      style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex justify-between text-xs mt-2 opacity-60">
                    <span>{usage.remaining} remaining</span>
                    <span>Resets 1st of each month</span>
                  </div>
                </div>
              )}
            </div>

            {/* Tool access list */}
            <Card>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Tools Included in Your Plan</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                {ALL_TOOLS.map(t => {
                  const included = t.plans.includes(plan)
                  return (
                    <div key={t.label} className="flex items-center gap-2">
                      <span className={`text-xs font-black w-4 flex-shrink-0 ${included ? 'text-emerald-500' : 'text-slate-200'}`}>
                        {included ? '✔' : '✗'}
                      </span>
                      <span className={`text-xs ${included ? 'text-slate-700' : 'text-slate-300'}`}>{t.label}</span>
                    </div>
                  )
                })}
              </div>
            </Card>

            {/* Upgrade nudge */}
            {plan !== 'AGENCY' && (
              <div className={`rounded-2xl p-5 ${plan === 'FREE' ? 'bg-blue-600' : 'bg-amber-500'} text-white`}>
                <div className="font-black text-base mb-1">
                  {plan === 'FREE' ? 'Unlock Content Optimizer with Pro' : 'Get Agency for more capacity'}
                </div>
                <div className="text-sm opacity-80 mb-4">
                  {plan === 'FREE'
                    ? 'Auto-fix your content issues with AI, starting at $19/mo'
                    : '200 analyses / month + priority support ($49/mo)'}
                </div>
                <Link href="/pricing"
                  className="inline-block bg-white text-sm font-black px-6 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
                  style={{ color: plan === 'FREE' ? '#2563eb' : '#d97706' }}>
                  {plan === 'FREE' ? 'See Pro Plan →' : 'See Agency Plan →'}
                </Link>
              </div>
            )}
          </div>
        )}

        {/* â"€â"€ BILLING TAB â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
        {!loading && tab === 'billing' && (
          <div className="space-y-4">

            {/* Subscription card */}
            <Card>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Subscription</div>

              {sub ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 rounded-xl p-3.5">
                      <div className="text-xs text-slate-400 mb-1">Plan</div>
                      <div className="font-black text-sm">{meta.label}</div>
                      <div className="text-xs text-slate-500">{meta.price}</div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3.5">
                      <div className="text-xs text-slate-400 mb-1">Status</div>
                      <Badge variant={sub.status === 'TRIALING' ? 'blue' : isActive ? 'green' : sub.status === 'CANCELLED' ? 'amber' : 'red'}>
                        {sub.status === 'TRIALING' ? 'Trial' : sub.status}
                      </Badge>
                    </div>
                    {nextBilling && (
                      <div className="bg-slate-50 rounded-xl p-3.5">
                        <div className="text-xs text-slate-400 mb-1">
                          {sub.status === 'CANCELLED' ? 'Access until' : sub.status === 'TRIALING' ? 'Trial ends' : 'Next billing'}
                        </div>
                        <div className="font-bold text-sm">{nextBilling}</div>
                      </div>
                    )}
                    <div className="bg-slate-50 rounded-xl p-3.5">
                      <div className="text-xs text-slate-400 mb-1">Subscription ID</div>
                      <div className="font-mono text-xs text-slate-500 truncate">{sub.dodoSubscriptionId}</div>
                    </div>
                  </div>

                  {/* Trial notice */}
                  {sub.status === 'TRIALING' && (
                    <div className="rounded-xl bg-blue-50 border border-blue-200 p-4">
                      <div className="text-xs font-bold text-blue-800 mb-1">You're on a free trial</div>
                      <p className="text-xs text-blue-700">
                        Your card will be charged {meta.price} on {nextBilling ?? 'your trial end date'}. Cancel anytime before then from the billing portal below and you won't be charged.
                      </p>
                    </div>
                  )}

                  {/* Cancellation notice */}
                  {sub.status === 'CANCELLED' && (
                    <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
                      <div className="text-xs font-bold text-amber-800 mb-1">Subscription cancelled</div>
                      <p className="text-xs text-amber-700 mb-3">
                        You retain access until {nextBilling ?? 'end of billing period'}. After that your account moves to the Free plan.
                      </p>
                      <Link href="/pricing" className="text-xs font-bold text-amber-800 underline">
                        Reactivate →
                      </Link>
                    </div>
                  )}

                  {/* Portal button */}
                  <div className="border-t border-slate-100 pt-4">
                    <Button onClick={openPortal} loading={portalLoading} className="w-full justify-center mb-2">
                      Open Billing Portal →
                    </Button>
                    <p className="text-xs text-slate-400 text-center">
                      Update payment method · Download invoices · Cancel anytime
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
                    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-blue-400">
                      <rect x="3" y="3" width="16" height="16" rx="2"/>
                      <line x1="7" y1="8" x2="15" y2="8"/>
                      <line x1="7" y1="11" x2="15" y2="11"/>
                    </svg>
                  </div>
                  <p className="text-sm font-black text-slate-800 mb-1">No active subscription</p>
                  <p className="text-xs text-slate-400 mb-6">You're on the Free plan · 3 analyses per month</p>
                  <Link href="/pricing"
                    className="inline-block rounded-xl bg-blue-600 px-8 py-3 text-sm font-bold text-white hover:bg-blue-700 transition-colors">
                    Upgrade to Pro ($19/mo) →
                  </Link>
                </div>
              )}
            </Card>

            {/* Invoice history */}
            {sub && (
              <Card className="bg-slate-50">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-slate-700">Invoice history</div>
                    <div className="text-xs text-slate-400 mt-0.5">All receipts available in the billing portal</div>
                  </div>
                  <button onClick={openPortal} disabled={portalLoading}
                    className="text-xs text-blue-600 hover:underline font-bold disabled:opacity-40">
                    {portalLoading ? 'Opening…' : 'View invoices →'}
                  </button>
                </div>
              </Card>
            )}

            {/* Support */}
            <Card className="bg-slate-50">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Billing Support</div>
              <p className="text-sm text-slate-600 mb-2">Questions about charges or your subscription?</p>
              <a href="mailto:billing@Optmizly.com" className="text-sm font-bold text-blue-600 hover:underline">
                billing@Optmizly.com
              </a>
              <p className="text-xs text-slate-400 mt-1">We respond within 24 hours</p>
            </Card>
          </div>
        )}

        {/* ── INTEGRATIONS TAB ── */}
        {!loading && tab === 'integrations' && (
          <div className="space-y-4">
            {gscBanner && (
              <div className={`rounded-xl p-4 text-sm font-medium ${
                gscBanner.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {gscBanner.message}
              </div>
            )}

            {plan !== 'AGENCY' ? (
              <div className="rounded-2xl p-5 bg-amber-500 text-white">
                <div className="font-black text-base mb-1">Connect Search Console (Agency feature)</div>
                <div className="text-sm opacity-80 mb-4">
                  Link your Google Search Console account to unlock real indexed-page data, sitemap status, and keyword cannibalization detection in SEO Audit ($49/mo)
                </div>
                <Link href="/pricing"
                  className="inline-block bg-white text-sm font-black px-6 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
                  style={{ color: '#d97706' }}>
                  See Agency Plan →
                </Link>
              </div>
            ) : (
              <Card>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Google Search Console</div>

                {gscLoading ? (
                  <div className="flex justify-center py-8"><Spinner /></div>
                ) : gscStatus?.connected ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-2 border-b border-slate-100">
                      <div>
                        <div className="text-sm font-medium">Status</div>
                        <div className="text-xs text-slate-400">
                          {gscStatus.sites === null
                            ? 'Connected, but could not reach Google right now'
                            : `Connected · ${gscStatus.sites?.length ?? 0} propert${gscStatus.sites?.length === 1 ? 'y' : 'ies'}`}
                        </div>
                      </div>
                      <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">Connected</span>
                    </div>

                    {gscStatus.sites && gscStatus.sites.length > 0 && (
                      <div className="space-y-1.5">
                        {gscStatus.sites.map(s => (
                          <div key={s.siteUrl} className="text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-2 truncate">{s.siteUrl}</div>
                        ))}
                      </div>
                    )}

                    <button onClick={disconnectGsc} disabled={gscDisconnecting}
                      className="text-xs text-red-500 hover:text-red-700 font-bold border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50">
                      {gscDisconnecting ? 'Disconnecting…' : 'Disconnect'}
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
                      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-blue-400">
                        <circle cx="9.5" cy="9.5" r="6"/>
                        <line x1="14" y1="14" x2="19" y2="19"/>
                      </svg>
                    </div>
                    <p className="text-sm font-black text-slate-800 mb-1">Not connected</p>
                    <p className="text-xs text-slate-400 mb-6 max-w-xs mx-auto">
                      Connect Search Console to unlock indexed-page data, sitemap status, and cannibalization checks in SEO Audit
                    </p>
                    <a href="/api/integrations/search-console/connect"
                      className="inline-block rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700 transition-colors">
                      Connect Google Search Console →
                    </a>
                  </div>
                )}
              </Card>
            )}
          </div>
        )}

      </div>
    </div>
  )
}

