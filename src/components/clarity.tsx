'use client'

import Script from 'next/script'
import { useEffect, useState } from 'react'

/**
 * Microsoft Clarity, loaded only after the visitor accepts cookies.
 *
 * Gated rather than always-on because Clarity is not counting page views: it records
 * sessions — pointer movement, clicks, scrolling and the DOM as rendered — and replays them.
 * Running that against someone who pressed Decline is the kind of thing the cookie banner
 * exists to prevent, and until now that banner decided nothing at all: it wrote
 * `cookie_consent` to localStorage and no code read it back.
 *
 * Consent is re-read on a `cookie-consent-change` event so accepting the banner starts
 * recording immediately. Without that the first session after consent — the one where the
 * visitor is deciding whether to sign up — would be the one session never recorded.
 *
 * Declining after accepting stops the *next* page load rather than the current one: a tag
 * already in the page cannot be unloaded, and pretending otherwise would be worse than
 * saying so. Clarity's own cookies are cleared by the browser controls the policy points to.
 */
export function Clarity({ projectId, nonce }: { projectId: string; nonce?: string }) {
  const [consented, setConsented] = useState(false)

  useEffect(() => {
    function read() {
      try {
        setConsented(localStorage.getItem('cookie_consent') === 'accepted')
      } catch {
        // Private mode, or storage blocked. Absence of consent is not consent.
        setConsented(false)
      }
    }
    read()
    window.addEventListener('cookie-consent-change', read)
    // Another tab accepting or declining counts too; `storage` only fires cross-tab.
    window.addEventListener('storage', read)
    return () => {
      window.removeEventListener('cookie-consent-change', read)
      window.removeEventListener('storage', read)
    }
  }, [])

  // The id lands inside a script body, so it is checked rather than trusted. It is our own
  // env var and not user input, but a stray quote would either break every page's JS or, if
  // the value were ever set from somewhere less controlled, close the string and run.
  if (!consented || !/^[a-z0-9]{1,32}$/i.test(projectId)) return null

  return (
    <Script id="ms-clarity" nonce={nonce} strategy="afterInteractive">
      {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${projectId}");`}
    </Script>
  )
}
