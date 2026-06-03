'use client'

import { cn } from '@/lib/utils'
import { ReactNode, ButtonHTMLAttributes } from 'react'

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
export function EmptyState({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-20 text-center">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-base font-bold text-slate-800 mb-2">{title}</h3>
      <p className="text-sm text-slate-500 max-w-xs leading-relaxed">{desc}</p>
    </div>
  )
}

// ── Locked state ──────────────────────────────────────────────────────────────
export function LockedState({ tool, plan }: { tool: string; plan: 'Pro' | 'Agency' }) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-20 text-center">
      <div className="text-4xl mb-4">🔒</div>
      <h3 className="text-base font-bold text-slate-800 mb-2">{tool}</h3>
      <p className="text-sm text-slate-500 max-w-xs mb-6">This tool requires the <strong>{plan}</strong> plan.</p>
      <a href="/pricing" className={cn(
        'rounded-xl px-6 py-2.5 text-sm font-bold text-white',
        plan === 'Agency' ? 'bg-gradient-to-r from-amber-500 to-amber-600' : 'bg-brand-600 hover:bg-brand-700'
      )}>
        Upgrade to {plan} →
      </a>
    </div>
  )
}
