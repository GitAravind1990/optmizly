'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { SignUp as ClerkSignUp } from '@clerk/nextjs'

export function SignUpForm() {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

  // Mirrors sign-in-form: forceRedirectUrl overrides Clerk's own handling of redirect_url, so
  // the value has to be carried through by hand or it is silently dropped. Sign-in has done
  // this since the redirect bug; sign-up had not, so anyone sent here with a destination --
  // the pricing page they were about to buy from, say -- lost it on the way through.
  // /auth-redirect validates the path before honouring it.
  const params = useSearchParams()
  const requested = params.get('redirect_url')
  const afterSignUp = requested
    ? `/auth-redirect?redirect_url=${encodeURIComponent(requested)}`
    : '/auth-redirect'

  if (!publishableKey) {
    return (
      <div className="w-full max-w-md p-6 border border-slate-200 rounded-2xl bg-white">
        <p className="text-center text-sm text-slate-600 mb-4">
          Sign-up requires Clerk credentials. For development, use the <Link href="/dashboard" className="font-semibold text-blue-600">dashboard</Link> instead.
        </p>
      </div>
    )
  }

  return (
    <ClerkSignUp
      forceRedirectUrl={afterSignUp}
      signInUrl="/login"
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
