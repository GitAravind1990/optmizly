'use client'

import { useState } from 'react'
import Link from 'next/link'
import { SignedIn, SignedOut } from './clerk-provider'

const blue = '#0000FF'
const blueMid = '#3B5BFF'
const cyan = '#4DEEFF'
const grad = `linear-gradient(118deg, ${blue} 0%, ${blueMid} 45%, ${cyan} 100%)`
const sans = "'Switzer', -apple-system, BlinkMacSystemFont, system-ui, sans-serif"

export function PageHeader() {
  const [open, setOpen] = useState(false)

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'rgba(255,255,255,0.92)',
      backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
      borderBottom: '1px solid #F0F2F6',
    }}>
      <style>{`
        .ph-nav { display: flex; gap: 26px; font-family: ${sans}; font-size: 15px; font-weight: 500; }
        .ph-auth { display: flex; align-items: center; gap: 14px; }
        .ph-burger { display: none; background: none; border: none; cursor: pointer; padding: 6px; line-height: 0; }
        .ph-mobile { display: none; flex-direction: column; padding: 12px 20px 20px; border-top: 1px solid #F0F2F6; gap: 2px; }
        .ph-mobile.is-open { display: flex; }
        @media (max-width: 639px) {
          .ph-nav { display: none; }
          .ph-auth { display: none; }
          .ph-burger { display: flex; align-items: center; justify-content: center; }
        }
      `}</style>

      <div style={{
        maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        {/* Logo + desktop nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
            <img src="/logo.png" alt="Optmizly" style={{ width: 32, height: 32, objectFit: 'contain', flexShrink: 0 }} />
            <span style={{ fontFamily: sans, fontWeight: 600, fontSize: 19, letterSpacing: -0.6, color: blue }}>
              optmizly
            </span>
          </Link>
          <nav className="ph-nav" />
        </div>

        {/* Desktop auth */}
        <div className="ph-auth">
          <SignedOut>
            <Link href="/login" style={{ fontFamily: sans, fontSize: 15, fontWeight: 500, color: '#0B1120', textDecoration: 'none' }}>
              Sign in
            </Link>
            <Link href="/signup" style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '0 20px', height: 40, borderRadius: 12,
              fontFamily: sans, fontSize: 14, fontWeight: 600,
              background: grad, color: '#fff', textDecoration: 'none',
              boxShadow: '0 6px 18px -6px rgba(0,0,255,0.5), inset 0 1px 0 rgba(255,255,255,0.2)',
            }}>
              Start Free →
            </Link>
          </SignedOut>
          <SignedIn>
            <Link href="/dashboard" style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '0 20px', height: 40, borderRadius: 12,
              fontFamily: sans, fontSize: 14, fontWeight: 600,
              background: grad, color: '#fff', textDecoration: 'none',
              boxShadow: '0 6px 18px -6px rgba(0,0,255,0.5), inset 0 1px 0 rgba(255,255,255,0.2)',
            }}>
              Open Dashboard →
            </Link>
          </SignedIn>
        </div>

        {/* Hamburger (mobile) */}
        <button className="ph-burger" onClick={() => setOpen(o => !o)} aria-label="Toggle menu">
          {open ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0B1120" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0B1120" strokeWidth="2" strokeLinecap="round">
              <line x1="4" y1="7" x2="20" y2="7" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="17" x2="20" y2="17" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      <div className={`ph-mobile${open ? ' is-open' : ''}`}>
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SignedOut>
            <Link href="/login" onClick={() => setOpen(false)} style={{
              fontFamily: sans, fontSize: 15, fontWeight: 500, color: '#0B1120',
              textDecoration: 'none', padding: '8px 0',
            }}>Sign in</Link>
            <Link href="/signup" onClick={() => setOpen(false)} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              height: 46, borderRadius: 12, fontFamily: sans, fontSize: 15, fontWeight: 600,
              background: grad, color: '#fff', textDecoration: 'none',
            }}>Start Free →</Link>
          </SignedOut>
          <SignedIn>
            <Link href="/dashboard" onClick={() => setOpen(false)} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              height: 46, borderRadius: 12, fontFamily: sans, fontSize: 15, fontWeight: 600,
              background: grad, color: '#fff', textDecoration: 'none',
            }}>Open Dashboard →</Link>
          </SignedIn>
        </div>
      </div>
    </header>
  )
}
