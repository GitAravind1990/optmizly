'use client'

import posthog from 'posthog-js'
import { PostHogProvider } from 'posthog-js/react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, Suspense } from 'react'

// Store utm/ref params in sessionStorage so signup_completed can read them
// even after Clerk redirects strip the query string.
if (typeof window !== 'undefined') {
  const p = new URLSearchParams(window.location.search)
  ;['utm_source', 'utm_medium', 'utm_campaign', 'ref'].forEach(k => {
    if (p.get(k)) sessionStorage.setItem(`ph_${k}`, p.get(k)!)
  })
}

if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
    capture_pageview: false,   // PageviewTracker below handles SPA navigation
    capture_pageleave: true,
    capture_exceptions: true,  // auto-captures unhandled JS errors + promise rejections
    respect_dnt: true,
    session_recording: {
      maskAllInputs: true,     // masks passwords, card fields, emails by default
    },
  })
}

// Tracks route changes for SPA navigation — must be in Suspense (useSearchParams)
function PageviewTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    const qs = searchParams.toString()
    posthog.capture('$pageview', {
      $current_url: window.location.origin + pathname + (qs ? `?${qs}` : ''),
    })
  }, [pathname, searchParams])

  return null
}

export function PHProvider({ children }: { children: React.ReactNode }) {
  return (
    <PostHogProvider client={posthog}>
      <Suspense>
        <PageviewTracker />
      </Suspense>
      {children}
    </PostHogProvider>
  )
}
