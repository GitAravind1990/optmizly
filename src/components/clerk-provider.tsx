'use client'

import { ReactNode, createContext, useContext } from 'react'

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

export function ClerkProviderWrapper({ children }: { children: ReactNode }) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

  // If no Clerk key is available, use stub provider for dev
  if (!publishableKey) {
    return <StubClerkProvider>{children}</StubClerkProvider>
  }

  // Dynamically import real ClerkProvider only if credentials are available
  const ClerkProvider = require('@clerk/nextjs').ClerkProvider
  return <ClerkProvider>{children}</ClerkProvider>
}

// Stub Clerk hooks
export function useSession() {
  const context = useContext(ClerkContext)
  if (!context) {
    return {
      isLoaded: true,
      session: null,
      isSignedIn: false,
    }
  }
  return context
}

export function useAuth() {
  const context = useContext(ClerkContext)
  if (!context) {
    return {
      isLoaded: true,
      userId: null,
      sessionId: null,
      getToken: async () => null,
      signOut: async () => {},
    }
  }
  return context
}

export function useUser() {
  const context = useContext(ClerkContext)
  if (!context) {
    return {
      isLoaded: true,
      user: null,
      isSignedIn: false,
    }
  }
  return context
}

// Stub components for Clerk when credentials aren't available
export function SignedOut({ children }: { children: ReactNode }) {
  const context = useContext(ClerkContext)
  const isSignedIn = context?.isSignedIn ?? false
  if (isSignedIn) return null
  return <>{children}</>
}

export function SignedIn({ children }: { children: ReactNode }) {
  const context = useContext(ClerkContext)
  const isSignedIn = context?.isSignedIn ?? false
  if (!isSignedIn) return null
  return <>{children}</>
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
