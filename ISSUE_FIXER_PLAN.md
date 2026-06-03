\# Content Optimizer - Complete Universal Plan



\*\*Status:\*\* Planning phase before implementation

\*\*Tool Name:\*\* Content Optimizer

\*\*Target:\*\* Market-leading intelligent content optimizer for ANY business, ANY content type



\---



\## Problem Statement



Current Issue Fixer (Recurrent Miscarriage example):

\- âŒ Does generic sentence rewrites

\- âŒ Issues persist after fixing (60% word count loss)

\- âŒ Doesn't address root causes

\- âŒ Medical-focused, not universal



New Content Optimizer:

\- âœ… Issue-type-specific surgical fixes

\- âœ… Issues are ACTUALLY resolved

\- âœ… Works for ANY business (restaurants, SaaS, fashion, medical, coaching, e-commerce, etc.)

\- âœ… Works for ANY content type (blogs, product pages, landing pages, articles, etc.)

\- âœ… Preserves â‰¥95% of original content

\- âœ… Can grow content for better quality



\---



\## Architecture



\### 5 Universal Fix Types



| Type | Root Cause | Fix Strategy | Examples |

|------|-----------|--------------|----------|

| \*\*Entities\*\* | Terms used without explanation | Add contextual definition on first mention | Restaurant: "sous vide" â†’ "sous vide (slow cooking in sealed bags)" \\| SaaS: "API" â†’ "API (Application Programming Interface)" |

| \*\*Citations\*\* | Claims unsourced/unattributed | Add source attribution, statistics, expert reference | Restaurant: "70% customers prefer..." â†’ "70% customers prefer... (2024 survey)" \\| SaaS: "Best practice is..." â†’ "Best practice is... (per industry report)" |

| \*\*E-E-A-T\*\* | Author/expertise not shown | Inject author credentials section, expertise signals | Restaurant: Add chef bio \\| SaaS: Add founder credentials \\| Medical: Add doctor credentials |

| \*\*Semantic Richness\*\* | Shallow/vague explanations | Expand terms with context, examples, benefits | Restaurant: "Fresh pasta" â†’ "Fresh pasta, handmade daily using traditional techniques..." \\| SaaS: "Fast platform" â†’ "Fast platform with 99.9% uptime..." |

| \*\*Technical SEO\*\* | Missing meta/schema/structure | Suggest meta descriptions, schema markup, H1-H3 hierarchy | All: Suggest title tag, meta description, JSON-LD schema |



\### Universal Approach - How It Works



Each fixer:

1\. \*\*Analyzes content context\*\* â€” Detects industry/business type from content

2\. \*\*Calls Claude with context\*\* â€” Generates industry-appropriate fixes

3\. \*\*Applies surgical fixes\*\* â€” Only modifies problematic sections, preserves â‰¥95% original

4\. \*\*Returns metadata\*\* â€” Lists what was fixed and why



\*\*Example:\*\*



\*\*Restaurant content:\*\*
Input: "We use fresh ingredients. Our pasta is homemade."

Issue: Entities - undefined term "homemade"

Claude analysis: Restaurant context detected

Fix: "Our pasta is homemade (prepared fresh in-house daily using traditional Italian techniques)."

\*\*SaaS content:\*\*

Input: "Our platform is fast. We process data efficiently."

Issue: Semantic - vague claim "fast"

Claude analysis: Software context detected

Fix: "Our platform is fast (sub-100ms response times) and processes data efficiently (handles 10,000+ requests/second)."



\*\*Medical content:\*\*

Input: "Treatment involves surgery. Success rate is high."

Issue: Citations - unsourced claim "high"

Claude analysis: Medical context detected

Fix: "Treatment involves surgery. Success rate is high (85-90% per ASRM 2024 guidelines)."



\---



\## Implementation Plan



\### Phase 1: Create 5 Universal Fixers

/src/lib/fixers/

â”œâ”€â”€ entities.ts       (Claude: context-aware entity definitions)

â”œâ”€â”€ citations.ts      (Claude: contextual source attribution)

â”œâ”€â”€ eeat.ts          (Claude: credibility/expertise injection)

â”œâ”€â”€ semantic.ts      (Claude: context expansion)

â”œâ”€â”€ technical.ts     (Claude: SEO meta/schema suggestions)

â””â”€â”€ index.ts         (export all fixers)



Each fixer receives:

\- `content`: Full article text

\- `issues`: Array of detected issues

\- `callClaude`: Function to call Claude API

\- `context`: Industry/business type (detected from content)



Each fixer returns:

\- `fixed\_content`: Improved text (â‰¥95% original)

\- `applied\_fixes`: List of fixes applied

\- `metadata`: What changed and why



\### Phase 2: Update Issue Detection



Modify `/src/app/api/analyse/route.ts`:

\- Add `category` tag: 'entities' | 'citations' | 'eeat' | 'semantic' | 'technical'

\- Add `type` tag: 'entity\_undefined' | 'citation\_missing' | 'author\_missing' | etc.

\- Keep existing `issue`, `fix`, `impact` fields



\### Phase 3: Create Content Optimizer Page



Create `/src/app/dashboard/optimizer/page.tsx`:

\- \*\*Step 1:\*\* Choose which fix types to apply (checkboxes for E-E-A-T, Entities, Citations, etc.)

\- \*\*Step 2:\*\* Preview which issues will be fixed

\- \*\*Step 3:\*\* See before/after with highlighted changes

\- \*\*Step 4:\*\* Download optimized content (HTML + DOCX)



\### Phase 4: Rewrite Optimizer API



Rewrite `/src/app/api/fixer/route.ts` â†’ `/src/app/api/optimizer/route.ts`:

\- Receives: content + issues + selected fix types

\- Loads fixers from `/src/lib/fixers/`

\- Applies fixers in optimal order: entities â†’ citations â†’ eeat â†’ semantic â†’ technical

\- Returns: fully optimized content + applied fixes metadata



\### Phase 5: Update Dashboard \& Plans



\- Rename "Issue Fixer" to "Content Optimizer" in sidebar

\- Add to PRO tier tools

\- Add icon: âš¡



\### Phase 6: Test With Multiple Industries



Test content from:

\- âœ… Restaurant (dining/hospitality)

\- âœ… SaaS (software/tech)

\- âœ… Medical (healthcare)

\- âœ… Fashion (e-commerce/lifestyle)

\- âœ… Coaching (services)

\- âœ… Real estate (properties)



\---



\## Why This is Market-Leading



| Feature | Jasper | Copy.ai | Surfer | Grammarly Pro | Content Optimizer |

|---------|--------|---------|--------|---------------|-------------------|

| Detects issues | âœ… | âœ… | âœ… | âœ… | âœ… |

| \*\*Fixes issues\*\* | âŒ | âŒ | âŒ | âŒ | \*\*âœ…\*\* |

| \*\*Issue-type-specific\*\* | âŒ | âŒ | âŒ | âŒ | \*\*âœ…\*\* |

| \*\*Surgical (â‰¥95% preserve)\*\* | âŒ | âŒ | âŒ | âŒ | \*\*âœ…\*\* |

| Universal (any industry) | âœ… | âœ… | âœ… | âœ… | âœ… |

| E-E-A-T aware | âš ï¸ | âš ï¸ | âœ… | âŒ | \*\*âœ…\*\* |

| Citation attribution | âŒ | âŒ | âŒ | âŒ | \*\*âœ…\*\* |

| Entity definitions | âŒ | âŒ | âŒ | âŒ | \*\*âœ…\*\* |



\*\*Unique selling point:\*\* Only tool that ACTUALLY FIXES the issues it detects, not just identifies them.



\---



\## Effort Estimate



| Phase | Task | Hours | Days |

|-------|------|-------|------|

| 1 | Build 5 universal fixers | 6-8 | 1 |

| 2 | Update issue detection | 1-2 | 0.5 |

| 3 | Create optimizer page | 2-3 | 0.5 |

| 4 | Rewrite optimizer API | 2-3 | 0.5 |

| 5 | Update dashboard/plans | 1 | 0.25 |

| 6 | Test multiple industries | 2-3 | 0.5 |



\*\*Total:\*\* 14-20 hours (2-3 days of development)



\---



\## Next Steps



1\. âœ… Create Content Optimizer plan (THIS FILE)

2\. â³ \*\*PHASE 1:\*\* Build 5 universal fixers

3\. â³ \*\*PHASE 2:\*\* Update issue detection in analyzer

4\. â³ \*\*PHASE 3:\*\* Create optimizer page UI

5\. â³ \*\*PHASE 4:\*\* Rewrite optimizer API

6\. â³ \*\*PHASE 5:\*\* Update dashboard \& tier assignment

7\. â³ \*\*PHASE 6:\*\* Test with 6+ industries



\---



\## Key Principles



\*\*1. Universal â‰  Generic\*\*

\- Each fixer uses Claude to understand business context

\- Fixes are tailored to industry, not one-size-fits-all



\*\*2. Surgical Preservation\*\*

\- Never truncate content

\- Only modify problematic sections

\- Maintain â‰¥95% original word count



\*\*3. Issue Resolution\*\*

\- Fixes address root cause, not symptoms

\- When re-analyzed, issues should be resolved



\*\*4. PRO Tier Feature\*\*

\- Premium tool for serious content creators

\- Justifies $19/month subscription

\- Enterprise-grade quality



\---



\## Success Metrics (After Launch)



\- âœ… Issues are resolved (not just flagged)

\- âœ… Content maintains â‰¥95% original word count

\- âœ… Works across 10+ industries without modification

\- âœ… Users see immediate improvement in content scores

\- âœ… Differentiate Optmizly from competitors


