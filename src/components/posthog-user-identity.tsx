'use client'

import { useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { usePathname } from 'next/navigation'
import posthog from 'posthog-js'

// Recording is disabled on these routes — credentials and payment data live here
const RECORDING_BLOCKED = ['/login', '/signup', '/portal', '/checkout']

export function PostHogUserIdentity() {
  const { user, isLoaded, isSignedIn } = useUser()
  const pathname = usePathname()

  // Stop session recording on sensitive pages
  useEffect(() => {
    if (RECORDING_BLOCKED.some(p => pathname?.startsWith(p))) {
      posthog.stopSessionRecording()
    }
  }, [pathname])

  // Identify on sign-in, reset on sign-out
  useEffect(() => {
    if (!isLoaded) return

    if (isSignedIn && user) {
      posthog.identify(user.id, {
        email: user.emailAddresses[0]?.emailAddress,
        name: user.fullName ?? undefined,
      })

      // signup_completed: fire once per user id, for accounts < 5 minutes old.
      // Uses localStorage so it survives page refreshes but fires only once.
      // utm params are read from sessionStorage (captured in posthog-provider before Clerk redirect strips them).
      const seenKey = `ph_signup_${user.id}`
      if (!localStorage.getItem(seenKey)) {
        localStorage.setItem(seenKey, '1')
        const age = Date.now() - new Date(user.createdAt ?? 0).getTime()
        if (age < 5 * 60 * 1000) {
          posthog.capture('signup_completed', {
            signup_source:
              sessionStorage.getItem('ph_utm_source') ??
              sessionStorage.getItem('ph_ref') ??
              undefined,
          })
        }
      }
    } else if (isLoaded && !isSignedIn) {
      posthog.reset()
    }
  }, [isLoaded, isSignedIn, user])

  return null
}
