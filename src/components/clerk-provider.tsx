'use client'

import { ReactNode, createContext, useContext } from 'react'
import { ClerkProvider } from '@clerk/nextjs'

// Stub Clerk context for development without credentials
const ClerkContext = createContext<any>(null)

function StubClerkProvider({ children }: { children: ReactNode }) {
  const stubContextValue = {
    session: null,
    user: null,
    isLoaded: true,
    isSignedIn: false,
    userId: null,
    sessionId: null,
  }

  return (
    <ClerkContext.Provider value={stubContextValue}>
      {children}
    </ClerkContext.Provider>
  )
}

export function ClerkProviderWrapper({ children, nonce }: { children: ReactNode; nonce?: string }) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

  // If no Clerk key is available, use stub provider for dev
  if (!publishableKey) {
    return <StubClerkProvider>{children}</StubClerkProvider>
  }

  return <ClerkProvider publishableKey={publishableKey} nonce={nonce} afterSignOutUrl="/">{children}</ClerkProvider>
}

import { useAuth } from '@clerk/nextjs'

function SignedInReal({ children }: { children: ReactNode }) {
  const { isSignedIn } = useAuth()
  return isSignedIn ? <>{children}</> : null
}

function SignedOutReal({ children }: { children: ReactNode }) {
  const { isSignedIn } = useAuth()
  return isSignedIn ? null : <>{children}</>
}

export function SignedIn({ children }: { children: ReactNode }) {
  const context = useContext(ClerkContext)
  // Stub mode (no publishable key)
  if (context !== null) return context.isSignedIn ? <>{children}</> : null
  return <SignedInReal>{children}</SignedInReal>
}

export function SignedOut({ children }: { children: ReactNode }) {
  const context = useContext(ClerkContext)
  if (context !== null) return context.isSignedIn ? null : <>{children}</>
  return <SignedOutReal>{children}</SignedOutReal>
}

export function UserButton() {
  return <div className="px-4 py-2 text-sm text-slate-600">User</div>
}

export function SignInButton({ children }: { children: ReactNode }) {
  return <a href="/login">{children}</a>
}

export function SignUpButton({ children }: { children: ReactNode }) {
  return <a href="/signup">{children}</a>
}
