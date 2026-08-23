/**
 * Pulls publicly-listed contact details out of a homepage we already fetched.
 *
 * No extra request and no enrichment vendor: the SEO check already has this HTML in hand,
 * and local business sites put their contact details in the footer. A third-party
 * enrichment API would mean a new sub-processor, a new bill, and sending every prospect's
 * domain to another company - for data that is usually sitting in a mailto: link.
 *
 * Scope, deliberately narrow: this reads what a business chose to publish on its own site.
 * It does not guess addresses from patterns (first.last@domain), does not query breach
 * corpora, and does not try to name individuals. An agency gets the same details a visitor
 * would find by scrolling to the bottom of the page.
 *
 * Role addresses are ranked above personal-looking ones. info@ and hello@ are a business
 * saying "write here"; a named mailbox is a person, and treating the two identically is how
 * cold outreach becomes something worth complaining about.
 */

export interface ExtractedContacts {
  emails: string[]
  phones: string[]
  socials: string[]
  /** A linked contact page, if the homepage points at one. Not fetched - just surfaced. */
  contactPageUrl: string | null
}

const MAX_PER_KIND = 5

/** Addresses that belong to tooling rather than the business. */
const NOISE_EMAIL = /(^|@)(noreply|no-reply|donotreply|sentry|wixpress|example|sentry\.io|godaddy|squarespace|shopify|placeholder|email|your|name|user)(@|\.|$)/i

/** Role mailboxes: a business publishing a way to be contacted, not an individual. */
const ROLE_EMAIL = /^(info|hello|contact|enquiries|inquiries|admin|office|sales|support|team|bookings|reception|mail)@/i

const SOCIAL_HOSTS = /(facebook|instagram|linkedin|twitter|x)\.com/i

function decodeEntities(v: string): string {
  return v.replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
          .replace(/&amp;/gi, '&')
}

function hrefsOf(html: string): string[] {
  const out: string[] = []
  for (const tag of html.match(/<a\b[^>]*>/gi) ?? []) {
    const m = tag.match(/href\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i)
    const href = m ? (m[2] ?? m[3] ?? m[4] ?? '') : ''
    if (href) out.push(decodeEntities(href.trim()))
  }
  return out
}

function stripped(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
}

/**
 * Phone numbers come only from tel: links, never from body text.
 *
 * Matching digit runs in prose finds prices, opening hours, addresses and licence numbers,
 * and a wrong number in a prospecting list is worse than no number - somebody eventually
 * calls it. A tel: link is the business stating this is a phone number.
 */
function normalizePhone(raw: string): string | null {
  const cleaned = raw.replace(/^tel:/i, '').replace(/[^\d+]/g, '')
  const digits = cleaned.replace(/\D/g, '')

  if (digits.length < 7) return null

  // E.164 caps a full international number at 15 digits, so anything longer is not a phone
  // number. Seen live: one firm's tel: href yielded "20016120720207057", 17 digits, which
  // looks like two numbers run together by a broken template.
  if (digits.length > 15) return null

  // A national-format number (leading 0, no country code) does not reach 13 digits either.
  // The same site produced "016120720207057" - 15 digits, inside the E.164 bound and still
  // not dialable. Both bounds are needed; neither catches the other's case.
  if (cleaned.startsWith('0') && digits.length > 12) return null

  return cleaned
}

export function extractContacts(html: string, finalUrl: string): ExtractedContacts {
  const body = stripped(html)
  const hrefs = hrefsOf(body)

  // ── Emails ────────────────────────────────────────────────────────────────
  const emails = new Set<string>()

  for (const href of hrefs) {
    if (!/^mailto:/i.test(href)) continue
    let address = href.replace(/^mailto:/i, '').split('?')[0]
    // Percent-decoded before anything else. Seen live: mailto:%20info@example.co.uk, which
    // otherwise yields "%20info@..." beside the clean address - the same mailbox twice, and
    // the broken copy is the one someone might paste into a mail client.
    try { address = decodeURIComponent(address) } catch { /* leave as-is if malformed */ }
    address = address.trim().toLowerCase()
    if (/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(address) && !NOISE_EMAIL.test(address)) emails.add(address)
  }

  // Plain-text addresses too, since plenty of sites print them without linking. Bounded to
  // the visible text so an address buried in a script's config is not collected.
  const text = body.replace(/<[^>]+>/g, ' ')
  for (const raw of text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) ?? []) {
    const address = raw.toLowerCase()
    // Filenames like logo@2x.png read as addresses to a naive regex.
    if (/\.(png|jpe?g|gif|svg|webp|css|js)$/i.test(address)) continue
    if (!NOISE_EMAIL.test(address)) emails.add(address)
  }

  // Role mailboxes first - see the note at the top of this file.
  const rankedEmails = [...emails].sort((a, b) => {
    const ra = ROLE_EMAIL.test(a) ? 0 : 1
    const rb = ROLE_EMAIL.test(b) ? 0 : 1
    return ra - rb || a.localeCompare(b)
  })

  // ── Phones ────────────────────────────────────────────────────────────────
  const phones = new Set<string>()
  for (const href of hrefs) {
    if (!/^tel:/i.test(href)) continue
    const phone = normalizePhone(href)
    if (phone) phones.add(phone)
  }

  // ── Socials ───────────────────────────────────────────────────────────────
  //   host -> profile URL. Keyed by host so one account per network survives: a footer that
  //   links the profile and three of its posts is one Instagram presence, not four.
  const socialByHost = new Map<string, string>()
  for (const href of hrefs) {
    if (!/^https?:\/\//i.test(href)) continue
    try {
      const u = new URL(href)
      if (!SOCIAL_HOSTS.test(u.host)) continue

      const path = u.pathname.replace(/\/+$/, '')
      // A bare share button points at the network's own root.
      if (path.length <= 1) continue
      // Posts, reels, tag pages and share intents are content, not accounts. Seen live: one
      // prospect produced four Instagram entries that were posts rather than profiles.
      if (/^\/(p|reel|reels|tv|explore|hashtag|share|sharer|intent|posts|photo|status|search)\b/i.test(path)) continue

      // First path segment is the handle; keep the shortest link to it.
      const handle = path.split('/').filter(Boolean)[0]
      if (!handle) continue
      const host = u.host.replace(/^www\./i, '')
      const existing = socialByHost.get(host)
      const candidate = `${u.origin}/${handle}`
      if (!existing || candidate.length < existing.length) socialByHost.set(host, candidate)
    } catch { /* unparseable href */ }
  }
  const socials = new Set<string>(socialByHost.values())

  // ── Contact page ──────────────────────────────────────────────────────────
  let contactPageUrl: string | null = null
  for (const href of hrefs) {
    if (!/contact|get-in-touch|reach-us/i.test(href)) continue
    try {
      const u = new URL(href, finalUrl)
      if (!/^https?:$/.test(u.protocol)) continue
      contactPageUrl = u.toString()
      break
    } catch { /* unparseable href */ }
  }

  return {
    emails: rankedEmails.slice(0, MAX_PER_KIND),
    phones: [...phones].slice(0, MAX_PER_KIND),
    socials: [...socials].slice(0, MAX_PER_KIND),
    contactPageUrl,
  }
}
