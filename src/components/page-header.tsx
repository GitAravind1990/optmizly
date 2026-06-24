'use client'

import Link from 'next/link'
import { SignedIn, SignedOut } from './clerk-provider'

const blue = '#0000FF'
const blueMid = '#3B5BFF'
const cyan = '#4DEEFF'
const grad = `linear-gradient(118deg, ${blue} 0%, ${blueMid} 45%, ${cyan} 100%)`
const sans = "'Geist', 'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif"

export function PageHeader() {
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'rgba(255,255,255,0.82)',
      backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
      borderBottom: '1px solid #F0F2F6',
    }}>
      <div style={{
        maxWidth: 1200, margin: '0 auto', padding: '0 32px', height: 70,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        {/* Left: logo + nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
            <img src="/logo.png" alt="Optmizly" style={{ width: 32, height: 32, objectFit: 'contain', flexShrink: 0 }} />
            <span style={{ fontFamily: sans, fontWeight: 600, fontSize: 19, letterSpacing: -0.6, color: blue }}>
              optmizly
            </span>
          </Link>
          <nav style={{ display: 'flex', gap: 26, fontFamily: sans, fontSize: 15, fontWeight: 500 }}>
            {[
              ['Pricing', '/pricing'],
              ['Blog', '/blog'],
            ].map(([label, href]) => (
              <Link key={label} href={href} style={{ color: '#4B5563', textDecoration: 'none' }}>
                {label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right: auth */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <SignedOut>
            <Link href="/login" style={{
              fontFamily: sans, fontSize: 15, fontWeight: 500,
              color: '#0B1120', textDecoration: 'none',
            }}>
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
      </div>
    </header>
  )
}
