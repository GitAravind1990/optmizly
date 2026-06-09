'use client'

import Link from 'next/link'
import { SignUp as ClerkSignUp } from '@clerk/nextjs'

export function SignUpForm() {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

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
