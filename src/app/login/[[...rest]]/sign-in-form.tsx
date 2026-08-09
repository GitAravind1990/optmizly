'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { SignIn as ClerkSignIn } from '@clerk/nextjs'

export function SignInForm() {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

  // The middleware guard bounces a signed-out visitor here with ?redirect_url=<page>.
  // forceRedirectUrl overrides Clerk's own handling of that parameter, so it has to be
  // carried through by hand — otherwise the value is silently dropped and everyone lands
  // on the dashboard home regardless of the link they followed. /auth-redirect validates
  // it before using it; nothing is trusted just because it arrived here.
  const params = useSearchParams()
  const requested = params.get('redirect_url')
  const afterSignIn = requested
    ? `/auth-redirect?redirect_url=${encodeURIComponent(requested)}`
    : '/auth-redirect'

  if (!publishableKey) {
    return (
      <div className="w-full max-w-md p-6 border border-slate-200 rounded-2xl bg-white">
        <p className="text-center text-sm text-slate-600 mb-4">
          Sign-in requires Clerk credentials. For development, use the <Link href="/dashboard" className="font-semibold text-blue-600">dashboard</Link> instead.
        </p>
      </div>
    )
  }

  return (
    <ClerkSignIn
      forceRedirectUrl={afterSignIn}
      signUpUrl="/signup"
      appearance={{
        elements: {
          rootBox: 'w-full',
          card: 'shadow-none border border-slate-200 rounded-2xl bg-white',
          headerTitle: 'hidden',
          headerSubtitle: 'hidden',
          socialButtonsBlockButton: 'border border-slate-200 hover:bg-slate-50',
          formButtonPrimary: 'bg-blue-600 hover:bg-blue-700 text-sm font-bold',
          footerActionLink: 'text-blue-600 hover:text-blue-700',
        },
      }}
    />
  )
}
