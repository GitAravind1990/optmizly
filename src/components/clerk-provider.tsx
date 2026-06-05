'use client'

import { ReactNode, useEffect, useState } from 'react'

export function ClerkProviderWrapper({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const [ClerkProvider, setClerkProvider] = useState<any>(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && !mounted) {
      import('@clerk/nextjs').then(mod => {
        setClerkProvider(() => mod.ClerkProvider)
        setMounted(true)
      })
    }
  }, [mounted])

  if (!mounted || !ClerkProvider) {
    return <>{children}</>
  }

  return <ClerkProvider>{children}</ClerkProvider>
}
