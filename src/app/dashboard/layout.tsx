'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { ContentProvider } from '@/context/ContentContext'

type UsageData = { plan: string; count: number; limit: number; remaining: number }

// ─── SVG icon set ─────────────────────────────────────────────────────────────
function NavIcon({ id }: { id: string }) {
  const icons: Record<string, React.ReactNode> = {
    'content-analyzer': <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="1" y="9" width="3" height="5" rx="0.5" fill="currentColor" stroke="none" opacity="0.7"/><rect x="6" y="5" width="3" height="9" rx="0.5" fill="currentColor" stroke="none"/><rect x="11" y="1" width="3" height="13" rx="0.5" fill="currentColor" stroke="none" opacity="0.6"/></svg>,
    'onpage':           <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="2" y="1" width="11" height="13" rx="1.5"/><line x1="5" y1="5" x2="10" y2="5"/><line x1="5" y1="8" x2="10" y2="8"/><line x1="5" y1="11" x2="8" y2="11"/></svg>,
    'ideas':            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="1" y="3" width="13" height="10" rx="1.5"/><line x1="1" y1="7" x2="14" y2="7"/><line x1="5" y1="3" x2="5" y2="2"/><line x1="10" y1="3" x2="10" y2="2"/></svg>,
    'rank-tracker':     <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="1,12 5,7 9,10 14,3"/><polyline points="11,3 14,3 14,6"/></svg>,
    'competitor-spy':   <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M1 7.5s2.8-5 6.5-5 6.5 5 6.5 5-2.8 5-6.5 5-6.5-5-6.5-5z"/><circle cx="7.5" cy="7.5" r="2"/></svg>,
    'optimizer':        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1l2 2-8.5 8.5-3.5 1 1-3.5L12 1z"/><path d="M10 3l2 2"/></svg>,
    'eeat':             <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7.5 1L13 3.5V7c0 3.5-2.5 6-5.5 7C4.5 13 2 10.5 2 7V3.5L7.5 1z"/></svg>,
    'gap':              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="7.5" cy="7.5" r="6"/><path d="M7.5 4v7M4 7.5h7"/></svg>,
    'citation':         <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="7.5" cy="9.5" r="2"/><path d="M4.5 7a4 4 0 016 0"/><path d="M2 4.5a7.5 7.5 0 0111 0"/><line x1="7.5" y1="11.5" x2="7.5" y2="14"/></svg>,
    'backlinks':        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 8.5a3 3 0 004.5.5l2-2a3 3 0 00-4.5-4l-1 1"/><path d="M8.5 6.5a3 3 0 00-4.5-.5l-2 2a3 3 0 004.5 4l1-1"/></svg>,
    'seo-audit':        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="11" height="11" rx="1.5"/><polyline points="5,7.5 6.5,9 10,5.5"/></svg>,
    'local-seo':        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M7.5 1a5 5 0 015 5c0 3.5-5 8.5-5 8.5S2.5 9.5 2.5 6a5 5 0 015-5z"/><circle cx="7.5" cy="6" r="1.75"/></svg>,
    'serp':             <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="2" y="2" width="11" height="2.5" rx="0.75" fill="currentColor" stroke="none"/><rect x="2" y="6.5" width="9" height="2.5" rx="0.75" fill="currentColor" stroke="none" opacity="0.7"/><rect x="2" y="11" width="7" height="2" rx="0.75" fill="currentColor" stroke="none" opacity="0.5"/></svg>,
    'topical':          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="7.5" cy="7.5" r="2"/><circle cx="2" cy="2.5" r="1.25"/><circle cx="13" cy="2.5" r="1.25"/><circle cx="2" cy="12.5" r="1.25"/><circle cx="13" cy="12.5" r="1.25"/><line x1="3.25" y1="3.25" x2="5.75" y2="6"/><line x1="11.75" y1="3.25" x2="9.25" y2="6"/><line x1="3.25" y1="11.75" x2="5.75" y2="9"/><line x1="11.75" y1="11.75" x2="9.25" y2="9"/></svg>,
    'local':            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="1" y="5.5" width="13" height="8.5" rx="1.5"/><path d="M4.5 5.5V4a3 3 0 016 0v1.5"/></svg>,
    'tracker':          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2h9v12l-4.5-2.5L3 14V2z"/><polyline points="5.5,7 7,8.5 9.5,6"/></svg>,
    'performance-fixer':<svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2.5 10.5a5.5 5.5 0 1110 0"/><path d="M7.5 4.5V6"/><path d="M7.5 7.5l2.5-2"/></svg>,
    'client-reports':   <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="3" width="9" height="11" rx="1"/><path d="M5.5 3V1.5h4V3"/><line x1="5.5" y1="7" x2="9.5" y2="7"/><line x1="5.5" y1="9.5" x2="8.5" y2="9.5"/></svg>,
    'geogrid':          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="1" y="1" width="5" height="5" rx="1"/><rect x="9" y="1" width="5" height="5" rx="1"/><rect x="1" y="9" width="5" height="5" rx="1"/><rect x="9" y="9" width="5" height="5" rx="1"/><circle cx="7.5" cy="7.5" r="1" fill="currentColor" stroke="none"/></svg>,
    'settings':         <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="7.5" cy="7.5" r="2.25"/><path d="M7.5 1v1.5M7.5 12.5V14M1 7.5h1.5M12.5 7.5H14M3.2 3.2l1.1 1.1M10.7 10.7l1.1 1.1M3.2 11.8l1.1-1.1M10.7 4.3l1.1-1.1"/></svg>,
    'lock':             <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="2" y="5.5" width="8" height="5.5" rx="1"/><path d="M4 5.5V4a2 2 0 014 0v1.5"/></svg>,
  }
  return <span className="flex items-center justify-center flex-shrink-0 w-4">{icons[id] ?? null}</span>
}

// ─── Tool groups ───────────────────────────────────────────────────────────────
const TOOL_GROUPS = [
  {
    label: 'Free',
    tools: [
      { id: 'content-analyzer', label: 'Content Analyzer', href: '/dashboard',                   minPlan: 'FREE'   },
      { id: 'onpage',           label: 'On-Page SEO',      href: '/dashboard/onpage',            minPlan: 'FREE'   },
    ],
  },
  {
    label: 'Pro',
    tools: [
      { id: 'ideas',           label: 'Content Planner',   href: '/dashboard/ideas',            minPlan: 'PRO' },
      { id: 'rank-tracker',    label: 'Rank Tracker',      href: '/dashboard/rank-tracker',     minPlan: 'PRO' },
      { id: 'competitor-spy',  label: 'Competitor Spy',    href: '/dashboard/competitor-spy',   minPlan: 'PRO' },
      { id: 'optimizer',       label: 'Content Optimizer', href: '/dashboard/optimizer',        minPlan: 'PRO' },
      { id: 'eeat',            label: 'E-E-A-T Analysis',  href: '/dashboard/eeat',             minPlan: 'PRO' },
      { id: 'gap',             label: 'Content Gap',       href: '/dashboard/gap',              minPlan: 'PRO' },
      { id: 'citation',        label: 'AI Visibility',     href: '/dashboard/citation',         minPlan: 'PRO' },
      { id: 'backlinks',       label: 'Backlinks',         href: '/dashboard/backlinks',        minPlan: 'PRO' },
    ],
  },
  {
    label: 'Agency',
    tools: [
      { id: 'seo-audit',         label: 'SEO Audit',            href: '/dashboard/seo-audit',         minPlan: 'AGENCY' },
      { id: 'local-seo',         label: 'Local SEO Suite',      href: '/dashboard/local-seo',         minPlan: 'AGENCY' },
      { id: 'serp',              label: 'SERP Audit',           href: '/dashboard/serp',              minPlan: 'AGENCY' },
      { id: 'topical',           label: 'Topical Authority',    href: '/dashboard/topical',           minPlan: 'AGENCY' },
      { id: 'local',             label: 'Local SEO',            href: '/dashboard/local',             minPlan: 'AGENCY' },
      { id: 'tracker',           label: 'Cite Tracker',         href: '/dashboard/tracker',           minPlan: 'AGENCY' },
      { id: 'performance-fixer', label: 'Performance Fixer',    href: '/dashboard/performance-fixer', minPlan: 'AGENCY' },
      { id: 'client-reports',    label: 'Client Reports',       href: '/dashboard/agency/clients',    minPlan: 'AGENCY' },
      { id: 'geogrid',           label: 'Geogrid',              href: '/dashboard/tools/geogrid',     minPlan: 'AGENCY' },
    ],
  },
]

type Tool = typeof TOOL_GROUPS[0]['tools'][0]

function isUnlocked(minPlan: string, userPlan: string): boolean {
  if (minPlan === 'FREE') return true
  if (minPlan === 'PRO') return userPlan === 'PRO' || userPlan === 'AGENCY'
  if (minPlan === 'AGENCY') return userPlan === 'AGENCY'
  return false
}

const TIER_BADGE: Record<string, string> = {
  PRO:    'text-brand-500 bg-brand-50 border border-brand-100',
  AGENCY: 'text-amber-600 bg-amber-50 border border-amber-100',
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [usage, setUsage] = useState<UsageData | null>(null)
  const pathname = usePathname()

  useEffect(() => {
    fetch('/api/user').then(r => r.json()).then(setUsage).catch(() => {})
  }, [])

  const plan = usage?.plan ?? 'FREE'
  const pct  = usage ? Math.min(100, (usage.count / usage.limit) * 100) : 0

  function isActive(tool: Tool) {
    if (tool.id === 'content-analyzer') return pathname === '/dashboard'
    if (tool.id === 'client-reports')   return pathname.startsWith('/dashboard/agency')
    if (tool.id === 'competitor-spy')   return pathname.startsWith('/dashboard/competitor-spy')
    if (tool.id === 'onpage')           return pathname.startsWith('/dashboard/onpage')
    if (tool.id === 'rank-tracker')     return pathname.startsWith('/dashboard/rank-tracker')
    if (tool.id === 'local-seo')        return pathname.startsWith('/dashboard/local-seo')
    if (tool.id === 'seo-audit')        return pathname.startsWith('/dashboard/seo-audit')
    if (tool.id === 'backlinks')        return pathname.startsWith('/dashboard/backlinks')
    return pathname === tool.href
  }

  const planLabel = plan === 'FREE' ? 'Free' : plan === 'PRO' ? 'Pro' : 'Agency'
  const barColor  = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-brand-500'

  return (
    <ContentProvider>
      <div className="flex h-screen overflow-hidden bg-white">

        {/* ── Sidebar ── */}
        <aside className="w-60 flex-shrink-0 border-r border-slate-100 bg-white overflow-y-auto flex flex-col">

          {/* Logo */}
          <div className="flex items-center gap-2.5 px-4 py-4 border-b border-slate-100">
            <Link href="/" className="flex items-center gap-2.5">
              <img src="/logo.png" alt="Optmizly" className="w-7 h-7 object-contain flex-shrink-0" />
              <span style={{ color: '#0000FF' }} className="font-semibold text-sm tracking-tight">optmizly</span>
            </Link>
          </div>

          {/* Plan + usage */}
          {usage && (
            <div className="px-4 py-3 border-b border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-700">{planLabel} Plan</span>
                <span className="text-xs text-slate-400">{usage.count} / {usage.limit}</span>
              </div>
              <div className="h-1 rounded-full bg-slate-100 overflow-hidden">
                <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
              </div>
              <div className="text-[11px] text-slate-400 mt-1.5">{usage.remaining} analyses remaining</div>
            </div>
          )}

          {/* Nav */}
          <nav className="flex-1 py-2 px-2">
            {TOOL_GROUPS.map(group => (
              <div key={group.label} className="mb-1">
                <div className={`px-2 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest ${group.label === 'Free' ? 'text-emerald-600' : group.label === 'Pro' ? 'text-brand-500' : 'text-amber-600'}`}>{group.label}</div>
                {group.tools.map(tool => {
                  const unlocked = isUnlocked(tool.minPlan, plan)
                  const active   = isActive(tool)
                  return (
                    <Link
                      key={tool.id}
                      href={unlocked ? tool.href : '/pricing'}
                      className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs transition-all mb-0.5 ${
                        active
                          ? 'bg-brand-600 text-white font-semibold shadow-sm'
                          : unlocked
                          ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                          : 'text-slate-300 cursor-not-allowed'
                      }`}
                    >
                      <NavIcon id={tool.id} />
                      <span className="flex-1 truncate">{tool.label}</span>
                      {!unlocked ? (
                        <NavIcon id="lock" />
                      ) : tool.minPlan !== 'FREE' && !active && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${TIER_BADGE[tool.minPlan] ?? ''}`}>
                          {tool.minPlan === 'AGENCY' ? 'Agency' : 'Pro'}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            ))}

            <div className="mx-1 my-2 h-px bg-slate-100" />
            <Link
              href="/dashboard/settings"
              className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                pathname === '/dashboard/settings'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <NavIcon id="settings" />
              <span>Settings</span>
            </Link>
          </nav>

          {/* Bottom: upgrade + user */}
          <div className="border-t border-slate-100 p-3 space-y-2">
            {plan === 'FREE' && (
              <Link href="/pricing" className="block w-full rounded-lg bg-brand-600 py-2 text-center text-xs font-semibold text-white hover:bg-brand-700 transition-colors">
                Upgrade to Pro →
              </Link>
            )}
            {plan === 'PRO' && (
              <Link href="/pricing" className="block w-full rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 py-2 text-center text-xs font-semibold text-white hover:opacity-90 transition-opacity">
                Upgrade to Agency →
              </Link>
            )}
            <div className="flex items-center gap-2.5 px-1">
              <UserButton afterSignOutUrl="/" />
              <span className="text-xs text-slate-400 truncate">{planLabel} Plan</span>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-hidden flex flex-col bg-slate-50">

          {/* Top bar */}
          <div className="flex-shrink-0 h-11 border-b border-slate-100 bg-white flex items-center justify-end gap-5 px-6">
            {[
              ['Blog', '/blog'],
              ['Pricing', '/pricing'],
              ['Help', 'mailto:hello@optmizly.com'],
            ].map(([label, href]) => (
              <Link key={label} href={href} className="text-xs font-medium text-slate-400 hover:text-slate-700 transition-colors">
                {label}
              </Link>
            ))}
          </div>

          {/* Page content */}
          <div className="flex-1 overflow-auto">
            {children}
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 border-t border-slate-100 bg-white px-6 h-9 flex items-center justify-between">
            <span className="text-[11px] text-slate-300">© 2026 Optmizly</span>
            <div className="flex items-center gap-4">
              {[
                ['Privacy', '/privacy'],
                ['Terms', '/terms'],
                ['Contact', 'mailto:hello@optmizly.com'],
              ].map(([label, href]) => (
                <Link key={label} href={href} className="text-[11px] text-slate-300 hover:text-slate-500 transition-colors">
                  {label}
                </Link>
              ))}
            </div>
          </div>

        </main>
      </div>
    </ContentProvider>
  )
}
