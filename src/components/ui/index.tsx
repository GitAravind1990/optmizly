'use client'

import { cn } from '@/lib/utils'
import { ReactNode, ButtonHTMLAttributes } from 'react'
import posthog from 'posthog-js'

// ── Button ────────────────────────────────────────────────────────────────────
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'amber'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  children: ReactNode
}

export function Button({ variant = 'primary', size = 'md', loading, children, className, disabled, ...props }: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-2 font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed'
  const variants = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm',
    secondary: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
    ghost: 'text-slate-600 hover:bg-slate-100',
    amber: 'bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:opacity-90',
  }
  const sizes = { sm: 'text-xs px-3 py-2', md: 'text-sm px-4 py-2.5', lg: 'text-base px-6 py-3' }
  return (
    <button className={cn(base, variants[variant], sizes[size], className)} disabled={disabled || loading} {...props}>
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  )
}

// ── Card ──────────────────────────────────────────────────────────────────────
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('rounded-2xl border border-slate-200 bg-white p-5', className)}>{children}</div>
}

// ── Spinner ───────────────────────────────────────────────────────────────────
export function Spinner({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizes = { sm: 'w-4 h-4 border-2', md: 'w-5 h-5 border-2', lg: 'w-7 h-7 border-2' }
  return (
    <span className={cn('inline-block rounded-full border-current border-t-transparent animate-spin', sizes[size], className)} />
  )
}

// ── Badge ─────────────────────────────────────────────────────────────────────
type BadgeVariant = 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'gray'
export function Badge({ children, variant = 'gray' }: { children: ReactNode; variant?: BadgeVariant }) {
  const variants: Record<BadgeVariant, string> = {
    blue:   'bg-blue-50 text-blue-700 border-blue-200',
    green:  'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber:  'bg-amber-50 text-amber-700 border-amber-200',
    red:    'bg-red-50 text-red-700 border-red-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    gray:   'bg-slate-100 text-slate-600 border-slate-200',
  }
  return <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-bold', variants[variant])}>{children}</span>
}

// ── ScoreBar ──────────────────────────────────────────────────────────────────
export function ScoreBar({ value, label, weight }: { value: number; label: string; weight?: string }) {
  const color = value >= 75 ? 'bg-emerald-500' : value >= 50 ? 'bg-amber-500' : 'bg-red-500'
  const textColor = value >= 75 ? 'text-emerald-600' : value >= 50 ? 'text-amber-600' : 'text-red-600'
  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs font-semibold text-slate-700">{label} {weight && <span className="text-slate-400 font-normal">{weight}</span>}</span>
        <span className={cn('text-xs font-black', textColor)}>{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, desc, cta }: {
  icon?: string
  title: string
  desc: string
  cta?: { label: string; href: string }
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-20 text-center">
      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
        {icon ? (
          <span className="text-2xl leading-none">{icon}</span>
        ) : (
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-slate-400">
            <rect x="3" y="3" width="16" height="16" rx="2"/>
            <line x1="7" y1="8" x2="15" y2="8"/>
            <line x1="7" y1="11" x2="15" y2="11"/>
            <line x1="7" y1="14" x2="11" y2="14"/>
          </svg>
        )}
      </div>
      <h3 className="text-base font-bold text-slate-800 mb-2">{title}</h3>
      <p className="text-sm text-slate-500 max-w-xs leading-relaxed">{desc}</p>
      {cta && (
        <a href={cta.href} className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-700 transition-colors">
          {cta.label} →
        </a>
      )}
    </div>
  )
}

// ── Locked state ──────────────────────────────────────────────────────────────
const PRO_BENEFITS = [
  'Unlimited content analyses every month',
  'All 17 SEO tools (SERP, E-E-A-T, Gap, Topical, Ranking Engine…)',
  'Rank Tracker, AI citation optimiser & Agency reports',
]

const AGENCY_BENEFITS = [
  'Everything in Pro, plus multi-client management',
  'White-label PDF reports for each client',
  'Query Tracker, GeoGrid & Local SEO suite',
]

export function LockedState({ tool, plan }: { tool: string; plan: 'Pro' | 'Agency' }) {
  const benefits = plan === 'Agency' ? AGENCY_BENEFITS : PRO_BENEFITS
  const price = plan === 'Agency' ? '$49/mo' : '$19/mo'
  const btnClass = plan === 'Agency'
    ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700'
    : 'bg-brand-600 hover:bg-brand-700'

  return (
    <div className="flex flex-col items-center justify-center h-full py-16 px-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-50 mx-auto mb-5">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
            <rect x="3" y="11" width="18" height="11" rx="2"/>
            <path d="M7 11V7a5 5 0 0110 0v4"/>
            <circle cx="12" cy="16" r="1" fill="currentColor" stroke="none"/>
          </svg>
        </div>
        <h3 className="text-xl font-black text-slate-900 text-center mb-2">{tool}</h3>
        <p className="text-sm text-slate-500 text-center mb-6">
          This tool requires the <strong>{plan}</strong> plan.
        </p>
        <ul className="space-y-3 mb-6">
          {benefits.map(b => (
            <li key={b} className="flex items-start gap-3 text-sm text-slate-700">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center mt-0.5">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                  <polyline points="1.5,5 4,7.5 8.5,2.5"/>
                </svg>
              </span>
              {b}
            </li>
          ))}
        </ul>
        <a
          href="/pricing"
          className={cn('block w-full rounded-2xl px-6 py-3.5 text-center text-sm font-bold text-white transition-colors', btnClass)}
          onClick={() => posthog.capture('upgrade_clicked', {
            from_plan: plan === 'Agency' ? 'PRO' : 'FREE',
            target_plan: plan.toUpperCase(),
            location: 'locked_tool',
            tool_name: tool,
          })}
        >
          Upgrade to {plan} ({price}) →
        </a>
      </div>
    </div>
  )
}
