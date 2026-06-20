// Enterprise SEO Audit — Complete Issues Framework (2026 Edition)
// Source: SEO_Issues_Framework_2026.docx (Arion Media Corp)
// 35 categories / 200+ checks.
//
// Each check has a stable `id` of the form `<categoryKey>.<subIndex>.<checkIndex>`.
// `auto: true` marks checks the regex/header engine in auto-checks.ts attempts to
// detect from the fetched page. Everything else is a manual checklist item.
// Judgement-heavy categories (E-E-A-T, AI/GEO, cannibalization, etc.) are scored by
// Claude at the category level rather than per check.

export type AuditPriority = 'Critical' | 'High' | 'Medium' | 'Low' | 'Advanced'
export type CheckStatus = 'pass' | 'fail' | 'warn' | 'na'

export interface AuditCheck {
  id: string
  label: string
  auto?: boolean
}

export interface AuditSubCategory {
  name: string
  checks: AuditCheck[]
}

export interface AuditCategory {
  num: number
  key: string
  title: string
  tag: string
  priority: AuditPriority
  /** true when Claude scores this category (judgement-based) */
  ai?: boolean
  subCategories: AuditSubCategory[]
}

// Build check ids deterministically so they stay stable as long as order is preserved.
function sub(name: string, checks: Array<[string, boolean?]>, key: string, subIndex: number): AuditSubCategory {
  return {
    name,
    checks: checks.map(([label, auto], i) => ({ id: `${key}.${subIndex}.${i}`, label, auto })),
  }
}

export const AUDIT_FRAMEWORK: AuditCategory[] = [
  {
    num: 1, key: 'crawling', title: 'Crawling Issues', tag: 'FOUNDATION', priority: 'Critical',
    subCategories: [
      sub('Robots.txt', [
        ['Important pages blocked'],
        ['CSS/JS files blocked', true],
        ['Entire site accidentally blocked', true],
        ['Incorrect directives (allow/disallow conflicts)'],
        ['Wildcard rules too aggressive'],
        ['Crawl-delay set too high', true],
      ], 'crawling', 0),
      sub('Crawl Budget', [
        ['Too many low-value URLs consuming budget'],
        ['Infinite URL parameter loops'],
        ['Faceted navigation duplicates'],
        ['Excessive pagination URLs'],
        ['Session IDs in URLs'],
        ['Tracking parameters not consolidated'],
      ], 'crawling', 1),
      sub('Broken Links', [
        ['Internal 404 errors'],
        ['External broken links'],
        ['Broken image URLs'],
        ['Broken CSS/JS resource links'],
      ], 'crawling', 2),
      sub('Orphan Pages', [
        ['Pages not linked from any other page'],
        ['Important pages inaccessible to crawlers'],
        ['Pages only reachable via XML sitemap'],
      ], 'crawling', 3),
    ],
  },
  {
    num: 2, key: 'indexing', title: 'Indexing Issues', tag: 'CRITICAL', priority: 'Critical',
    subCategories: [
      sub('Noindex Problems', [
        ['Important pages marked noindex', true],
        ['Noindex tags left from development phase', true],
        ['Noindex in HTTP header conflicting with meta tag', true],
        ['Noindex on paginated pages that should be indexed'],
      ], 'indexing', 0),
      sub('Canonical Issues', [
        ['Missing canonical tags', true],
        ['Self-referencing canonicals absent', true],
        ['Multiple canonical tags on one page', true],
        ['Canonical pointing to wrong/404 page'],
        ['Canonical and noindex conflict on same page', true],
        ['Cross-domain canonicals not set up correctly'],
      ], 'indexing', 1),
      sub('Duplicate Content', [
        ['HTTP and HTTPS both indexed'],
        ['WWW and non-WWW both indexed'],
        ['Parameter URLs indexed (sort, filter, color)'],
        ['Printer-friendly page versions indexed'],
        ['Product/filter URL duplicates'],
        ['Mobile subdomain (m.) duplicate'],
      ], 'indexing', 2),
      sub('Thin Content', [
        ['Pages under 200 words with no clear purpose', true],
        ['Empty or near-empty category pages'],
        ['Auto-generated low-value pages'],
        ['Doorway/location-landing-page spam'],
      ], 'indexing', 3),
    ],
  },
  {
    num: 3, key: 'architecture', title: 'Website Architecture', tag: 'STRUCTURE', priority: 'High',
    subCategories: [
      sub('URL Structure', [
        ['Dynamic URLs with multiple parameters', true],
        ['URLs over 75 characters', true],
        ['Non-descriptive URLs (ID-only slugs)'],
        ['Multiple URL versions for same content'],
        ['Inconsistent trailing slash usage'],
        ['Uppercase characters in URLs', true],
      ], 'architecture', 0),
      sub('Site Depth', [
        ['Important pages more than 3-4 clicks from homepage'],
        ['Orphan pages not in site hierarchy'],
        ['Flat architecture with no topical clustering'],
      ], 'architecture', 1),
      sub('Internal Linking', [
        ['Weak internal linking to key pages', true],
        ['Broken internal links'],
        ['No hub-and-spoke / topic cluster structure'],
        ['Poor or generic anchor text', true],
        ['Too many links per page (diluting equity)', true],
        ['Nofollow on internal links unnecessarily', true],
      ], 'architecture', 2),
      sub('Navigation', [
        ['Important pages not in main navigation'],
        ['JavaScript-only navigation (unrenderable)'],
        ['No HTML sitemap for users'],
        ['Mega menus not crawlable'],
      ], 'architecture', 3),
    ],
  },
  {
    num: 4, key: 'cwv', title: 'Page Speed & Core Web Vitals', tag: 'PERFORMANCE', priority: 'High',
    subCategories: [
      sub('LCP Issues', [
        ['Hero image not preloaded (missing fetchpriority=high)', true],
        ['LCP element is CSS background (not fetchable)'],
        ['Slow server response inflating LCP'],
        ['Web font blocking render'],
        ['No responsive image srcset', true],
      ], 'cwv', 0),
      sub('INP Issues', [
        ['Heavy JavaScript on interaction'],
        ['Long tasks blocking main thread'],
        ['Third-party scripts delaying response', true],
        ['React/Vue hydration delays'],
      ], 'cwv', 1),
      sub('CLS Issues', [
        ['Images without explicit width/height', true],
        ['Ads causing layout shifts'],
        ['Web fonts causing FOUT/FOIT shifts'],
        ['Dynamically injected banners above content'],
      ], 'cwv', 2),
      sub('Performance', [
        ['Images not in WebP/AVIF format', true],
        ['Unoptimized/unminified JavaScript'],
        ['Render-blocking CSS in <head>', true],
        ['Too many active plugins'],
        ['No browser caching headers', true],
        ['No CDN'],
        ['Slow TTFB (>600ms)'],
        ['No lazy loading on below-fold images', true],
      ], 'cwv', 3),
    ],
  },
  {
    num: 5, key: 'mobile', title: 'Mobile SEO Issues', tag: 'MOBILE', priority: 'High',
    subCategories: [
      sub('Mobile Usability', [
        ['Text too small to read without zoom'],
        ['Clickable elements too close together (<48px)'],
        ['Content wider than viewport'],
        ['Mobile viewport tag missing or misconfigured', true],
        ['Interstitials/pop-ups blocking content on mobile'],
      ], 'mobile', 0),
      sub('Responsive Design', [
        ['Non-responsive pages (fixed-width layouts)', true],
        ['Different content served to mobile vs. desktop'],
        ['Desktop-only resources loading on mobile'],
        ['Tap targets not meeting minimum size'],
      ], 'mobile', 1),
    ],
  },
  {
    num: 6, key: 'https', title: 'HTTPS & Security', tag: 'SECURITY', priority: 'High',
    subCategories: [
      sub('SSL Problems', [
        ['Mixed content warnings (HTTP assets on HTTPS page)', true],
        ['Invalid or expired SSL certificate', true],
        ['HTTP pages still accessible (no redirect to HTTPS)', true],
        ['HSTS header not set', true],
      ], 'https', 0),
      sub('Security Issues', [
        ['Malware infections detected'],
        ['Hacked pages with spam content'],
        ['Spam content injections in footer/header'],
        ['Open redirects exploitable for phishing'],
      ], 'https', 1),
    ],
  },
  {
    num: 7, key: 'sitemap', title: 'XML Sitemap Issues', tag: 'CRAWL', priority: 'Medium',
    subCategories: [
      sub('Sitemap Errors', [
        ['Missing XML sitemap', true],
        ['Sitemap not submitted to GSC'],
        ['Non-indexable URLs included (noindex pages)'],
        ['Redirect URLs in sitemap'],
        ['404 URLs in sitemap'],
        ['Sitemap over 50MB or 50,000 URLs (needs splitting)', true],
        ['Incorrect lastmod dates'],
        ['Missing image sitemap'],
        ['Missing video sitemap'],
      ], 'sitemap', 0),
    ],
  },
  {
    num: 8, key: 'schema', title: 'Structured Data / Schema', tag: 'E-E-A-T', priority: 'High',
    subCategories: [
      sub('Implementation Errors', [
        ['Invalid schema syntax (fails Rich Results Test)', true],
        ['Missing required fields (e.g., name, url, address)'],
        ['Duplicate schema blocks on same page', true],
        ['Schema in JS not renderable by Google'],
        ['Mismatch between schema and visible page content'],
      ], 'schema', 0),
      sub('Missing Schemas', [
        ['Organization / LocalBusiness', true],
        ['MedicalClinic / Hospital', true],
        ['Person (doctors as entities)', true],
        ['BreadcrumbList', true],
        ['FAQPage', true],
        ['Article / MedicalWebPage', true],
        ['Review / AggregateRating', true],
        ['Service', true],
        ['Video', true],
        ['Event', true],
        ['Speakable (for voice search)', true],
        ['SiteNavigationElement', true],
      ], 'schema', 1),
    ],
  },
  {
    num: 9, key: 'redirects', title: 'Redirect Issues', tag: 'TECHNICAL', priority: 'High',
    subCategories: [
      sub('Redirect Problems', [
        ['Redirect chains (A > B > C, should be A > C)', true],
        ['Redirect loops (A > B > A)', true],
        ['302 used instead of 301 for permanent moves', true],
        ['307 used incorrectly', true],
        ['Internal links pointing to redirected URLs'],
        ['Redirect to homepage instead of relevant page'],
      ], 'redirects', 0),
    ],
  },
  {
    num: 10, key: 'statusCodes', title: 'HTTP Status Code Issues', tag: 'INDEXING', priority: 'Medium',
    subCategories: [
      sub('Status Code Problems', [
        ['Soft 404: 200 status code showing error content'],
        ['410 (Gone) used incorrectly vs. 404'],
        ['500 Internal Server Errors on key pages', true],
        ['503 pages not removed after maintenance', true],
        ['Meta refresh redirects instead of 301', true],
        ['302s on permanently moved content', true],
      ], 'statusCodes', 0),
    ],
  },
  {
    num: 11, key: 'international', title: 'International SEO', tag: 'GLOBAL', priority: 'Medium',
    subCategories: [
      sub('Hreflang Issues', [
        ['Missing hreflang tags for multilingual content', true],
        ['Incorrect language codes (e.g., en vs en-IN)', true],
        ['Return tag missing (must be reciprocal)'],
        ['Hreflang in sitemap not matching page'],
        ['x-default not set', true],
      ], 'international', 0),
      sub('Geo-Targeting', [
        ['Wrong country targeting in GSC'],
        ['Missing regional signals (local addresses, currency)'],
        ['Duplicate content across regional versions'],
        ['Incorrect ccTLD or subdirectory structure'],
      ], 'international', 1),
    ],
  },
  {
    num: 12, key: 'javascript', title: 'JavaScript SEO', tag: 'RENDERING', priority: 'High',
    subCategories: [
      sub('Rendering Problems', [
        ['Critical content only visible after JS execution', true],
        ['SPA: content not rendered server-side (SSR missing)', true],
        ['React/Vue hydration errors blocking content'],
        ['Lazy-loaded content not discoverable by crawlers'],
        ['Hidden content (display:none) holding key SEO content', true],
      ], 'javascript', 0),
    ],
  },
  {
    num: 13, key: 'images', title: 'Image SEO', tag: 'ASSETS', priority: 'Medium',
    subCategories: [
      sub('Image Optimization', [
        ['Missing or empty alt text', true],
        ['Alt text stuffed with keywords'],
        ['Large uncompressed image files'],
        ['No WebP/AVIF format', true],
        ['Missing image sitemap'],
        ['Images blocked via robots.txt', true],
        ['Missing width/height attributes (causes CLS)', true],
        ['No lazy loading on below-fold images', true],
      ], 'images', 0),
    ],
  },
  {
    num: 14, key: 'pagination', title: 'Pagination Issues', tag: 'CRAWL', priority: 'Medium',
    subCategories: [
      sub('Pagination Errors', [
        ['No canonical to paginated pages (or incorrect)'],
        ['rel=next/prev not implemented', true],
        ['Infinite scroll with no crawlable URL version'],
        ['Paginated pages blocked from indexing incorrectly'],
        ['Paginated URLs in sitemap unnecessarily'],
        ['First page not self-canonicalized'],
      ], 'pagination', 0),
      sub('Affected Site Types', [
        ['E-commerce product listings'],
        ['Hospital blog archives'],
        ['News & media websites'],
        ['FAQ and resource pages'],
      ], 'pagination', 1),
    ],
  },
  {
    num: 15, key: 'faceted', title: 'Faceted Navigation Issues', tag: 'E-COMMERCE', priority: 'Medium',
    subCategories: [
      sub('Faceted Nav Problems', [
        ['Filter combinations creating millions of duplicate URLs'],
        ['No canonical tag on filter pages (all should point to base)'],
        ['Filter URLs indexed unnecessarily'],
        ['No robots.txt or noindex on facet parameters'],
        ['Internal links to every filter combination (crawl waste)'],
        ['No URL parameter handling set in GSC'],
        ['Conflicting canonicals across filter pages'],
        ['Faceted pages with no unique content getting indexed'],
      ], 'faceted', 0),
    ],
  },
  {
    num: 16, key: 'urlParams', title: 'URL Parameter Issues', tag: 'TECHNICAL', priority: 'Medium',
    subCategories: [
      sub('Parameter Problems', [
        ['Tracking parameters (utm_source, fbclid) creating duplicate pages'],
        ['Session IDs in URLs indexed by Google'],
        ['Sort/filter parameters not consolidated via canonical'],
        ['Parameters not declared in GSC URL Parameters tool'],
        ['Inconsistent parameter order creating duplicates'],
        ['Internal links including unnecessary parameters'],
      ], 'urlParams', 0),
    ],
  },
  {
    num: 17, key: 'indexBloat', title: 'Index Bloat Issues', tag: 'CRITICAL', priority: 'High',
    subCategories: [
      sub('Pages to Deindex', [
        ['WordPress tag archive pages'],
        ['Author archive pages'],
        ['Attachment/media pages (WordPress)'],
        ['Internal search result pages'],
        ['Filter/facet URL combinations'],
        ['Paginated pages beyond page 2-3 (blog archives)'],
        ['Staging or dev site pages indexed'],
        ['Parameter URL duplicates'],
        ['Thin affiliate or auto-generated pages'],
      ], 'indexBloat', 0),
      sub('Impact Assessment', [
        ['Crawl budget diluted across low-value pages'],
        ['Link equity spread to pages with no ranking value'],
        ["Google's quality assessment of site lowered"],
        ['Important pages crawled less frequently'],
      ], 'indexBloat', 1),
    ],
  },
  {
    num: 18, key: 'server', title: 'Server & Hosting Issues', tag: 'INFRASTRUCTURE', priority: 'High',
    subCategories: [
      sub('Server Problems', [
        ['Frequent server downtime (5xx errors)'],
        ['Slow TTFB (>600ms; ideal <200ms)'],
        ['Shared hosting with resource contention'],
        ['No CDN for static assets'],
        ['CDN misconfigured (serving stale content)'],
        ['DNS resolution time too high'],
        ['Server location far from target audience'],
      ], 'server', 0),
    ],
  },
  {
    num: 19, key: 'logFile', title: 'Log File & Crawl Analysis', tag: 'ADVANCED', priority: 'Advanced',
    subCategories: [
      sub('Googlebot Access', [
        ['Googlebot being blocked or throttled'],
        ['Important pages rarely or never crawled'],
        ['Low-value pages being over-crawled'],
        ['Crawl frequency misaligned with update schedule'],
        ['Non-Google bots consuming crawl budget'],
      ], 'logFile', 0),
    ],
  },
  {
    num: 20, key: 'breadcrumbs', title: 'Breadcrumb Issues', tag: 'UX + SEO', priority: 'Medium',
    subCategories: [
      sub('Breadcrumb Errors', [
        ['No breadcrumb navigation visible on page', true],
        ["Breadcrumb doesn't match actual URL hierarchy"],
        ['BreadcrumbList schema missing', true],
        ['Schema hierarchy incorrect (wrong order)'],
        ['Breadcrumbs using JS only (not crawlable)'],
        ['Multiple breadcrumb schemas on same page', true],
      ], 'breadcrumbs', 0),
    ],
  },
  {
    num: 21, key: 'wordpress', title: 'WordPress-Specific Issues', tag: 'CMS', priority: 'Medium',
    subCategories: [
      sub('Plugin Issues', [
        ['Multiple SEO plugins active simultaneously'],
        ['Duplicate meta tags from theme + plugin conflict', true],
        ['SEO plugin misconfigured (noindexing whole site)'],
        ['Too many active plugins slowing site'],
      ], 'wordpress', 0),
      sub('Archive Pages', [
        ['Tag pages indexed unnecessarily'],
        ['Author archive pages indexed'],
        ['Date-based archives indexed'],
        ['Attachment/media library pages indexed'],
      ], 'wordpress', 1),
      sub('WP Technical', [
        ['Excessive redirect chains from permalink changes'],
        ['Category base (/category/) in URLs not removed', true],
        ['Default WordPress URLs (?p=123) still accessible'],
        ['xmlrpc.php accessible (security + crawl issue)'],
        ['readme.html leaking WordPress version'],
      ], 'wordpress', 2),
    ],
  },
  {
    num: 22, key: 'cannibalization', title: 'Content Cannibalization', tag: 'NEW', priority: 'High', ai: true,
    subCategories: [
      sub('Detection Signals', [
        ['Multiple URLs ranking for the same keyword in GSC'],
        ['Keyword ranking fluctuating between two URLs'],
        ['Similar meta titles/H1s across multiple pages'],
        ['Blog posts and service pages targeting same term'],
      ], 'cannibalization', 0),
      sub('Resolution Actions', [
        ['Consolidate cannibalizing pages via 301 redirect'],
        ['Add canonical from thin version to authoritative page'],
        ['Differentiate content intent (informational vs. commercial)'],
        ['Update internal linking to favour the preferred page'],
        ['Remove duplicate/thin version from index'],
      ], 'cannibalization', 1),
    ],
  },
  {
    num: 23, key: 'localSeo', title: 'Local SEO Technical Factors', tag: 'NEW', priority: 'High', ai: true,
    subCategories: [
      sub('NAP Consistency', [
        ['Inconsistent business name across web (GMB, website, citations)'],
        ['Address format varies across platforms'],
        ['Phone number format inconsistent (with/without STD code)'],
        ['Old address not removed from directories'],
      ], 'localSeo', 0),
      sub('Local Pages', [
        ['No dedicated location landing pages'],
        ['Location pages with identical content (thin/duplicate)'],
        ['Missing LocalBusiness schema on location pages', true],
        ['GMB URL not matching website branch URL'],
        ['Missing city/area in page title and H1', true],
      ], 'localSeo', 1),
      sub('GMB Signals', [
        ['GMB profile incomplete (missing hours, categories)'],
        ['No GMB posts published recently'],
        ['Unclaimed or unverified GMB listings'],
        ['GMB photos outdated or insufficient'],
        ['Q&A section not managed'],
      ], 'localSeo', 2),
    ],
  },
  {
    num: 24, key: 'eeat', title: 'E-E-A-T Signals', tag: 'NEW', priority: 'Critical', ai: true,
    subCategories: [
      sub('Experience', [
        ['No first-hand experience signals in content'],
        ['No case studies, real results, or patient stories'],
        ['No doctor/author bio with credentials'],
      ], 'eeat', 0),
      sub('Expertise', [
        ['No author bylines on medical/health content'],
        ['Author not linked to credentials or qualification page'],
        ['Content not reviewed by a qualified professional'],
      ], 'eeat', 1),
      sub('Authoritativeness', [
        ['No mentions or citations from authoritative sources'],
        ['No backlinks from medical journals or trusted sites'],
        ['No Wikipedia entity or Knowledge Panel'],
        ['Missing Organization entity in schema', true],
      ], 'eeat', 2),
      sub('Trustworthiness', [
        ['No medical disclaimer on health content'],
        ['No privacy policy or terms of service'],
        ['No clear contact information'],
        ['SSL errors or mixed content warnings', true],
        ['Outdated or incorrect medical information'],
      ], 'eeat', 3),
    ],
  },
  {
    num: 25, key: 'aiSeo', title: 'AI Search & Entity SEO (2026)', tag: 'NEW', priority: 'High', ai: true,
    subCategories: [
      sub('Entity Gaps', [
        ['Doctors not marked as Person entities in schema', true],
        ['Treatments not connected to medical conditions'],
        ['Organization entity missing from About page'],
        ['Clinic not in Google Knowledge Graph'],
        ['No Wikidata or Wikipedia entity'],
      ], 'aiSeo', 0),
      sub('GEO Readiness', [
        ['No FAQ content on treatment pages'],
        ['No statistics or research citations in content'],
        ['No expert quotes or attributable statements'],
        ['Content not structured for direct answer extraction'],
        ['Missing Speakable schema for voice search', true],
      ], 'aiSeo', 1),
      sub('Topical Authority', [
        ['Content cluster incomplete (hub page + supporting pages)'],
        ['No interlinking between related treatment pages'],
        ['Weak brand signal (inconsistent name usage)'],
        ['No co-citation with authoritative medical sources'],
      ], 'aiSeo', 2),
      sub('Citation Readiness', [
        ['No unique data points or research'],
        ["No 'last reviewed by' dates on medical content"],
        ['No structured definitions for conditions/treatments'],
        ['Content too short to be citeable source'],
      ], 'aiSeo', 3),
    ],
  },
  {
    num: 26, key: 'thirdParty', title: 'Third-Party Script Management', tag: 'NEW', priority: 'Medium',
    subCategories: [
      sub('Script Issues', [
        ['Unaudited third-party scripts running on every page', true],
        ['Analytics, chat widgets, ad scripts blocking render', true],
        ['Scripts loading synchronously in <head>', true],
        ['No Script Manager or tag manager governance'],
        ['Duplicate tracking pixels (GA4 + UA still active)', true],
        ['Chat widgets causing significant CLS'],
        ['Consent banner scripts loading before consent given'],
      ], 'thirdParty', 0),
    ],
  },
  {
    num: 27, key: 'social', title: 'Social & Open Graph Tags', tag: 'NEW', priority: 'Low',
    subCategories: [
      sub('OG / Twitter Card', [
        ['Missing og:title, og:description, og:image', true],
        ['og:image too small for platform requirements (<1200x630px)'],
        ['Missing twitter:card tag', true],
        ['OG tags not set on blog/article pages', true],
        ['Same OG title as meta title (no differentiation)', true],
        ['No og:type set (article, website, etc.)', true],
      ], 'social', 0),
    ],
  },
  {
    num: 28, key: 'siteSearch', title: 'Site Search Indexing', tag: 'NEW', priority: 'Medium',
    subCategories: [
      sub('Search Page Issues', [
        ['Internal site search result pages being indexed'],
        ['?s= or ?q= parameters not blocked via robots.txt or noindex', true],
        ['Search pages appearing in Google SERPs'],
        ['No-results pages indexed with thin content'],
        ['Sitemap containing search result URLs'],
      ], 'siteSearch', 0),
    ],
  },
  {
    num: 29, key: 'renderability', title: 'Renderability Issues', tag: 'TECHNICAL', priority: 'High',
    subCategories: [
      sub('Render Problems', [
        ['JS-generated content not in initial HTML response', true],
        ['React/Next.js hydration errors visible in console'],
        ['Content inside iframes not indexable', true],
        ['Lazy-loaded images using IntersectionObserver not crawlable'],
        ['Tab/accordion content hidden until JS interaction'],
        ['Critical text in CSS pseudo-elements (::before/::after)'],
      ], 'renderability', 0),
    ],
  },
  {
    num: 30, key: 'migration', title: 'Website Migration Issues', tag: 'CRITICAL', priority: 'Critical',
    subCategories: [
      sub('Migration Risks', [
        ['URL changes without 301 redirects'],
        ['Missing canonical tags post-migration', true],
        ['Internal links still pointing to old URLs'],
        ['Sitemap not updated post-migration'],
        ['GSC property not updated to new domain/protocol'],
        ['Robots.txt accidentally blocking new URL structure', true],
        ['Old site content still accessible at original URL'],
      ], 'migration', 0),
    ],
  },
  {
    num: 31, key: 'linkEquity', title: 'Link Equity Flow', tag: 'ADVANCED', priority: 'Medium',
    subCategories: [
      sub('Equity Distribution', [
        ['Key pages receiving insufficient internal links'],
        ['Excessive links pointing to low-priority pages'],
        ['Weak pillar/hub page structure'],
        ['Nofollow on internal links unnecessarily reducing flow', true],
        ['Navigation links pointing to redirected URLs'],
        ['Footer links overloaded with low-value targets', true],
      ], 'linkEquity', 0),
    ],
  },
  {
    num: 32, key: 'discovery', title: 'Content Discovery Issues', tag: 'ARCHITECTURE', priority: 'Medium',
    subCategories: [
      sub('Discovery Blockers', [
        ['No HTML sitemap (user-facing)'],
        ['Orphan pages with no internal links'],
        ['Poor hub-and-spoke architecture'],
        ['New content not interlinked from existing pages'],
        ['Categories too broad (no topic clustering)'],
        ['Blog posts not linked from relevant service pages'],
      ], 'discovery', 0),
    ],
  },
  {
    num: 33, key: 'accessibility', title: 'Accessibility & SEO Overlap', tag: 'NEW', priority: 'Medium',
    subCategories: [
      sub('Overlap Issues', [
        ['Images with no alt text (affects both a11y and image SEO)', true],
        ['No heading hierarchy (H1 > H2 > H3 skipped)', true],
        ["Links with no descriptive text ('click here', 'read more')", true],
        ['Videos with no captions or transcript'],
        ['Tables with no headers (TH elements)', true],
        ['Poor colour contrast affecting readability signals'],
      ], 'accessibility', 0),
    ],
  },
  {
    num: 34, key: 'cwvRootCause', title: 'Core Web Vitals Root Cause Analysis', tag: 'PERFORMANCE', priority: 'High',
    subCategories: [
      sub('LCP Root Causes', [
        ['Hero image not fetchpriority=high', true],
        ['LCP is a background CSS image (not preloadable)'],
        ['Font blocking paint (no font-display: swap)'],
        ['Slow API response delaying content render'],
      ], 'cwvRootCause', 0),
      sub('CLS Root Causes', [
        ['Images without explicit dimensions', true],
        ['Ads injected above content'],
        ['Cookie/GDPR banners pushing layout'],
        ['Web fonts swapping after render'],
      ], 'cwvRootCause', 1),
      sub('INP Root Causes', [
        ['Heavy click event handlers'],
        ['Third-party chat/analytics scripts', true],
        ['Large DOM with slow style recalculations', true],
        ['React re-renders on every keystroke'],
      ], 'cwvRootCause', 2),
    ],
  },
  {
    num: 35, key: 'backlinks', title: 'Backlinks & Link Profile', tag: 'AUTHORITY', priority: 'High',
    subCategories: [
      sub('Domain Authority', [
        ['Domain has established page rank (OPR score ≥ 3)', true],
        ['Domain globally ranked (rank < 1,000,000)', true],
      ], 'backlinks', 0),
      sub('Link Profile Quality', [
        ['No toxic or spammy referring domains'],
        ['Diverse anchor text distribution'],
        ['Majority of links are dofollow from relevant sites'],
        ['No sudden unnatural link velocity spikes'],
      ], 'backlinks', 1),
      sub('Link Equity', [
        ['Internal pages receive link equity from external backlinks'],
        ['No PageRank sculpting via excessive nofollow'],
        ['Key landing pages have strong external link support'],
      ], 'backlinks', 2),
      sub('Competitive Link Gap', [
        ['Site has comparable backlinks to top competitors'],
        ['No significant referring domain gap vs. competitors'],
      ], 'backlinks', 3),
    ],
  },
]

// ─── Derived helpers ───────────────────────────────────────────────────────────

export const ALL_CHECKS: AuditCheck[] = AUDIT_FRAMEWORK.flatMap(c =>
  c.subCategories.flatMap(s => s.checks)
)

export const TOTAL_CHECKS = ALL_CHECKS.length

export const AUTO_CHECK_IDS = new Set(
  ALL_CHECKS.filter(c => c.auto).map(c => c.id)
)

export const CATEGORY_BY_KEY: Record<string, AuditCategory> = Object.fromEntries(
  AUDIT_FRAMEWORK.map(c => [c.key, c])
)

/** Categories scored by Claude rather than the regex engine. */
export const AI_CATEGORY_KEYS = AUDIT_FRAMEWORK.filter(c => c.ai).map(c => c.key)

export const PRIORITY_RANK: Record<AuditPriority, number> = {
  Critical: 0, High: 1, Medium: 2, Advanced: 3, Low: 4,
}
