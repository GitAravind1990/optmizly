/**
 * Where the Chrome extension lives, once it lives anywhere.
 *
 * **Empty until the Web Store listing is published.** Everything on the site that offers the
 * extension is gated on this string, so today those surfaces render nothing at all rather
 * than a button that 404s. A link to a listing that does not exist is the same failure as
 * copy promising a tool that does not exist, and it is worse on the page whose whole promise
 * is "no account, no card, no trial to cancel".
 *
 * To turn it on: paste the listing URL here, in one commit, once the extension is live. It
 * looks like https://chromewebstore.google.com/detail/<slug>/<32-letter id>. Nothing else
 * needs changing — the card, the section heading and the layout all appear with it.
 *
 * Same shape as `hasStats`/`hasTestimonials` in src/lib/social-proof.ts, and for the same
 * reason: a claim renders when it is true, and is absent when it is not.
 *
 * The extension's source is a separate repo (G:\optmizly-chrome-extension). Its submission
 * checklist is STORE-LISTING.md there; its privacy policy is /extension-privacy here, which
 * is live already because the Web Store requires the URL before it will accept a listing.
 */
export const CHROME_EXTENSION_URL = ''

/** True once the listing exists. Read this rather than testing the string at each call site. */
export const hasChromeExtension = CHROME_EXTENSION_URL.length > 0
