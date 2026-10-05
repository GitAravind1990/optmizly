# Product Hunt launch — optmizly.com

Everything to paste, plus the sequence. Written 2026-10-03.

**What is being launched:** the platform at optmizly.com, with the free no-account audit as the
front door. Not the Chrome extension — it is not through Web Store review yet, and a launch
needs a link that works on the day.

---

## The honest frame

Two things are true at once and the launch has to hold both.

**The product is strong where it counts for this audience.** The homepage opens with a free
audit that needs no account, returns a real report in seconds, and finds genuine faults —
including the snippet directives that keep a page out of AI Overviews while it ranks perfectly,
which almost nothing else checks. Four tools work without signing up. The pricing page states
what each plan enforces rather than what it markets.

**There are no customers yet, and the launch must not pretend otherwise.** No "trusted by",
no logo wall, no invented numbers. Product Hunt's audience is unusually good at spotting a
seeded launch, and this is a tool for people who audit things for a living. The credibility
play is the opposite of social proof: *point the tool at your own site in public and show what
it finds.*

---

## Listing fields

**Name**
```
Optmizly
```

**Tagline** (60 characters, counts below are exact)

Pick one. The first is the recommendation: it names the new problem rather than the category,
and "quote" is the word that makes an SEO stop scrolling.

| Tagline | Chars |
|---|---|
| Find out if AI search is allowed to quote your pages | 52 |
| Your SEO is fine. Can ChatGPT actually quote the page? | 54 |
| The free audit that checks if AI search can cite you | 52 |
| SEO, GEO and AEO in one place — starting with a free audit | 58 |

**Description** (260 characters)
```
Paste a URL and see what an AI crawler sees: structure, schema, attribution, and the snippet
rules that quietly keep a page out of AI Overviews while it ranks fine. Free, no account. 24
tools behind it when you want them.
```

**Topics**
```
SEO · Artificial Intelligence · Marketing · Developer Tools · Chrome Extensions (later)
```

**Links** — website `https://optmizly.com` · pricing `https://optmizly.com/pricing` ·
free audit `https://optmizly.com/tools/ai-search-readiness`

---

## The first comment

The most-read text on the page. Post it the moment the launch goes live, from the maker
account.

```
Hi Product Hunt 👋

I built Optmizly because the question changed and the tools didn't.

For twenty years the job was: rank in a list, earn the click. Now an answer engine reads a
handful of pages and writes the answer itself, and the prize is being one of the pages it
quotes. That is a different problem, and most SEO tools still measure the old one.

The free audit on the homepage is the honest version of what I mean. Paste a URL, no account,
and it reads the page the way a crawler would: structure, schema, attribution, whether the
content is extractable at all. It also checks something I have not seen elsewhere — the
snippet directives. A page carrying `nosnippet` or `max-snippet:0` can rank perfectly well
and still be impossible for Google to quote in an AI Overview. One meta tag, invisible in
every ranking report, and your page cannot be cited.

Two things I would rather say up front than be asked:

**There are no customers yet.** No logo wall, no "trusted by", no numbers I cannot show you.
It is a free plan, two paid tiers and a lot of work. If that is disqualifying for you, fair.

**It will tell you unflattering things about my own site.** Run it on optmizly.com — the blog
index scores 69 and the fixes it lists are real ones I have not done. I would rather you see
that than a staged 98.

Free plan is three analyses a month, no card. Paid starts at $9. Four tools work with no
account at all.

Happy to answer anything, including the sceptical questions — especially those.
```

---

## Gallery

1270×760. Generated from the live site by `node scripts/make-ph-gallery.mjs`, so every frame
is a real screen and the numbers in them are the ones the product returned.

| Image | Shows |
|---|---|
| `01-hero.png` | A real audit result on optmizly.com's own blog — the score, the categories |
| `02-free-tools.png` | The four no-signup tools |
| `03-pricing.png` | Free tier, $9 start, credit costs stated |

**Thumbnail:** 240×240 — use `public/logo.png`.

> **The hero frame needs regenerating before launch.** The free audit is capped at 5 a day per
> IP and building this gallery spends one; the cap was exhausted while iterating on 2026-10-03,
> so `01-hero.png` currently shows the form rather than a finished report. Re-run the script on
> a fresh day and it will capture the real thing. The script now fails with that explanation
> rather than a silent timeout.

---

## Timing

- **Go live at 12:01 AM Pacific.** The ranking window is a calendar day in PT; launching later
  gives away hours of it.
- **Tuesday, Wednesday or Thursday.** Monday is crowded, Friday and the weekend are quiet —
  fewer votes to win, but also fewer eyes, and the leaderboard carries into the newsletter.
- **Avoid shipping to production that day.** Pushing to `main` deploys within seconds here, and
  a deploy inside a cron's scheduled hour can cost that run. Freeze the day before.

## Before the day

- [ ] Re-run `scripts/make-ph-gallery.mjs` on a fresh day for the hero frame
- [ ] Run the free audit yourself on three or four well-known sites and read the output — you
      will be asked "what does it say about X" within the hour
- [ ] Check signup end to end, including Google sign-in, from a browser you are not signed into
- [ ] Check the free-tool daily caps are what you want them to be under real traffic (5 a day
      per IP for the audit, E-E-A-T and regex; 3 a month for the prospect finder)
- [ ] Have the pricing page open in a tab — the first sceptical question is usually "what's the
      catch with the free tier"
- [ ] Confirm PRODUCTHUNT is live and has places left: `node scripts/create-launch-discount.mjs`
      prints the redemption count, and /api/offer-spots is what the popup reads

## On the day

- [ ] Post the first comment immediately, before any promotion
- [ ] Put the offer in that first comment, as `optmizly.com/pricing?code=PRODUCTHUNT`. The link
      carries the code through signup and prefills it at checkout, so nobody has to remember it
- [ ] Answer every comment, including the hostile ones, in your own voice
- [ ] Share where you already are: LinkedIn, any SEO community you actually participate in. Do
      **not** ask for upvotes — PH penalises it and the audience notices
- [ ] Watch for the question "how is this different from [Ahrefs/Semrush/Surfer]" and answer it
      honestly: they measure ranking, this measures quotability, and you still need theirs

## After

- [ ] Whatever the placing, the durable wins are the backlink and the first real users. Ask the
      people who sign up what they expected and did not get
- [ ] The Chrome extension is a second launch when it clears review — a separate PH post, and a
      better one

---

## What not to do

- No fake urgency. There *is* a launch discount now — PRODUCTHUNT, 15% off any plan for
  three billing cycles — and 15% is deliberately small for this reason: it is a thank-you
  for showing up, not a reason to have waited. Anyone already paying can use it too
- No "trusted by" logos, no invented user counts, no testimonials you do not have
- No upvote exchanges or launch pods. They are visible, and this audience talks
- Do not claim the extension exists until it is listed
