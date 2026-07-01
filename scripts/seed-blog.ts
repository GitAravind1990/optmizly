import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const posts = [
  {
    slug: 'how-to-optimise-content-for-ai-search',
    title: 'How to Optimise Content for AI Search (ChatGPT, Perplexity, Gemini)',
    description: 'AI search engines cite sources differently from Google. Here\'s exactly how to make your content visible in ChatGPT, Perplexity, and Gemini answers.',
    category: 'AI Search',
    tags: 'ai search,llm citation,perplexity,chatgpt,content optimization',
    readingTime: '7 min read',
    content: `
<h2>Why AI search is different from Google</h2>
<p>When someone searches on Google, they see a list of links and choose which to click. When someone asks ChatGPT or Perplexity a question, they get a direct answer — with a small number of sources cited inline. If your content isn't one of those sources, you get zero traffic from that query, regardless of your Google ranking.</p>
<p>This is the core shift happening right now. Search is fragmenting. A growing share of research queries never reach Google at all — they go straight to AI assistants. And those assistants have very specific requirements for what they cite.</p>

<h2>How AI models decide what to cite</h2>
<p>Large language models and retrieval-augmented systems like Perplexity don't rank pages the way Google does. They evaluate content for a different set of signals:</p>
<ul>
  <li><strong>Answerability</strong> — Does your content directly answer a specific question? Pages that hedge or bury the answer rank poorly.</li>
  <li><strong>Entity coverage</strong> — Does your content mention the key entities (people, places, concepts, organisations) that a knowledgeable answer would include?</li>
  <li><strong>Factual density</strong> — AI models prefer content with specific numbers, dates, named examples, and attributable claims over vague generalisations.</li>
  <li><strong>Structured information</strong> — Headers, lists, tables, and FAQ sections make content easier to extract and cite.</li>
  <li><strong>Source authority</strong> — Does your content cite credible external sources? AI models are more likely to cite sources that themselves cite sources.</li>
</ul>

<h2>The 6 things to change in your content right now</h2>

<h3>1. Lead with the direct answer</h3>
<p>AI retrievers look for the most direct response to a query. If your article spends three paragraphs on background before answering, the model may not extract it correctly. Put the direct answer in the first paragraph — then expand with context and nuance below.</p>

<h3>2. Use specific numbers and named examples</h3>
<p>Compare these two sentences:</p>
<ul>
  <li>"Page speed is important for user experience."</li>
  <li>"Pages that load in under 2 seconds convert 15% better than pages that take 4 seconds (Google/Deloitte, 2023)."</li>
</ul>
<p>The second sentence is far more likely to be cited in an AI answer because it contains a specific, attributable claim. Go through your content and replace vague claims with specific ones wherever possible.</p>

<h3>3. Add FAQ sections</h3>
<p>FAQ sections map directly to how AI assistants receive queries — as questions. A well-structured FAQ with direct, specific answers to common questions in your niche is one of the highest-yield changes you can make for AI citation potential.</p>

<h3>4. Cover all the expected entities</h3>
<p>Every topic has a set of entities — people, concepts, tools, standards — that an authoritative answer would naturally include. If your content on "content marketing" doesn't mention HubSpot, Google Search Console, or content calendars, an AI model may judge it as incomplete. Run a content gap analysis to find which entities you're missing.</p>

<h3>5. Add external citations</h3>
<p>AI models are trained to value sources that themselves cite sources. Add links to relevant studies, official documentation, and credible publications in your field. This signals epistemic credibility — that your content is grounded in verifiable information, not opinion.</p>

<h3>6. Structure with descriptive headers</h3>
<p>Headers that describe exactly what the section covers ("How to calculate content ROI" rather than "Measuring success") help AI extractors identify and retrieve the right chunk of content for a specific query. Write your headers as if they're answers to questions someone might ask.</p>

<h2>How to measure your AI citation potential</h2>
<p>The challenge with AI search optimisation is that it's hard to measure directly. You can't check your "Perplexity ranking" the way you check your Google position. What you can measure is:</p>
<ul>
  <li><strong>Citation likelihood score</strong> — A structured evaluation of whether your content meets the criteria AI models use to cite sources.</li>
  <li><strong>Entity coverage</strong> — Which expected entities appear in your content and which are missing.</li>
  <li><strong>Answerability</strong> — Whether your content directly answers the queries you're targeting.</li>
</ul>
<p>Optmizly's <strong>AI Visibility</strong> and <strong>Citation Tracker</strong> tools score your content against these exact criteria and show you which specific changes will increase your citation likelihood for each target query.</p>

<h2>The bottom line</h2>
<p>AI search isn't replacing SEO — it's adding a new layer on top of it. The content that performs best in AI answers tends to also perform well in Google: it's specific, well-structured, authoritative, and genuinely useful. But the emphasis is different. AI search rewards directness, factual density, and entity completeness in ways that traditional SEO doesn't fully capture.</p>
<p>Start with your most important pages. Run them through an AI citation analysis, find the gaps, and fix the top three issues. The sites that get ahead of this now will be the ones AI models cite by default a year from now.</p>
    `.trim(),
    published: true,
  },

  {
    slug: 'what-is-eeat-and-how-to-improve-your-score',
    title: 'What Is E-E-A-T and How to Improve Your Score in 2025',
    description: 'E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness) is how Google evaluates content quality. Here\'s what it means and exactly how to improve each dimension.',
    category: 'SEO Fundamentals',
    tags: 'eeat,google,seo,content quality,expertise,trustworthiness',
    readingTime: '8 min read',
    content: `
<h2>What E-E-A-T actually means</h2>
<p>E-E-A-T stands for Experience, Expertise, Authoritativeness, and Trustworthiness. It's the framework Google's human quality raters use to evaluate pages, and it directly informs how Google's algorithms are trained to assess content quality. It's not a ranking signal you can check in Search Console — it's a collection of signals that, taken together, tell Google whether your content deserves to rank.</p>
<p>The extra "E" for Experience was added in December 2022. It distinguishes between someone who knows about a topic academically and someone who has actually done the thing they're writing about. A travel article written by someone who visited the destination reads differently — and ranks differently — from one produced by someone who has never been there.</p>

<h2>The four dimensions explained</h2>

<h3>Experience</h3>
<p>Experience signals show that the author has first-hand knowledge of what they're writing about. This includes:</p>
<ul>
  <li>Personal anecdotes, case studies, and specific outcomes ("when I ran this test for a client in 2023...")</li>
  <li>Original photos, screenshots, or data from real work</li>
  <li>Opinions that go beyond what every other article says — takes that only come from having actually done something</li>
  <li>Disclosure of personal context ("as a registered dietitian with 8 years of clinical practice...")</li>
</ul>

<h3>Expertise</h3>
<p>Expertise signals show formal or demonstrated knowledge in the subject area:</p>
<ul>
  <li>Author bio with relevant credentials, qualifications, and experience</li>
  <li>Content that demonstrates deep domain knowledge — specific terminology used correctly, nuanced positions, awareness of edge cases</li>
  <li>Citations of primary sources (research papers, official documentation, industry standards)</li>
  <li>Author pages that link to external profiles (LinkedIn, published works, speaking engagements)</li>
</ul>

<h3>Authoritativeness</h3>
<p>Authoritativeness is about reputation — what others say about you, not what you say about yourself:</p>
<ul>
  <li>Backlinks from authoritative sites in your niche</li>
  <li>Brand mentions and press coverage</li>
  <li>Citations of your content in other articles</li>
  <li>Reviews and testimonials (especially for local businesses and products)</li>
  <li>Social proof: followers, engagement, community presence</li>
</ul>

<h3>Trustworthiness</h3>
<p>Trustworthiness signals that your site is safe, honest, and reliable:</p>
<ul>
  <li>Clear author attribution on every article</li>
  <li>Transparent about-us and contact information</li>
  <li>Privacy policy and terms of service</li>
  <li>Accurate, up-to-date information with clear publication and update dates</li>
  <li>No deceptive ads, hidden affiliate disclosure, or misleading claims</li>
  <li>HTTPS and secure checkout (for e-commerce)</li>
</ul>

<h2>Why E-E-A-T matters more in some niches than others</h2>
<p>Google calls certain topics "Your Money or Your Life" (YMYL) — content that could significantly affect a reader's health, finances, safety, or wellbeing. Medical, legal, financial, and news content is held to an especially high E-E-A-T standard because bad information in these areas can cause real harm.</p>
<p>That said, E-E-A-T matters across all niches now. The 2023 Helpful Content updates made it clear that Google wants to reward content made by people with genuine knowledge and experience, regardless of topic.</p>

<h2>How to improve your E-E-A-T score: a practical checklist</h2>

<h3>Author signals</h3>
<ul>
  <li>Add a detailed author bio to every article (50–150 words, credentials, relevant experience)</li>
  <li>Create individual author pages and link articles to them</li>
  <li>Link author pages to LinkedIn, Twitter/X, and other professional profiles</li>
  <li>Include a headshot — real photos increase perceived trust</li>
</ul>

<h3>Content signals</h3>
<ul>
  <li>Add first-hand experience to every article: a case study, a personal example, original data</li>
  <li>Cite primary sources with hyperlinks — don't just say "studies show"</li>
  <li>Add "last updated" dates and actually keep content current</li>
  <li>Use schema markup: Article, Person, Organization, FAQPage</li>
</ul>

<h3>Site-wide signals</h3>
<ul>
  <li>Create a detailed About page that explains who runs the site and why</li>
  <li>Make contact information easy to find</li>
  <li>Add review and testimonial content</li>
  <li>Build topical authority by covering your niche deeply, not broadly</li>
</ul>

<h2>How to measure where you stand</h2>
<p>E-E-A-T is qualitative by nature, but you can score it systematically. Optmizly's <strong>E-E-A-T Analysis</strong> tool evaluates your content across all four dimensions and gives you a score out of 100 for each one, with specific recommendations for what to fix first. Run it on your most important pages to see where your biggest gaps are.</p>

<h2>The bottom line</h2>
<p>E-E-A-T isn't a checkbox — it's a long-term investment in becoming a site that both Google and readers trust. The sites winning in organic search right now are the ones that demonstrate genuine expertise, cite credible sources, and make it absolutely clear who is behind the content and why they're qualified to write it.</p>
<p>Start with your author bios and your top three articles. Get those right first, then build outward.</p>
    `.trim(),
    published: true,
  },

  {
    slug: 'how-to-do-a-content-gap-analysis',
    title: 'How to Do a Content Gap Analysis (Step-by-Step)',
    description: 'A content gap analysis reveals what topics your competitors rank for that you don\'t. Here\'s a step-by-step process to find and close the gaps.',
    category: 'SEO Strategy',
    tags: 'content gap analysis,seo strategy,competitor analysis,content marketing',
    readingTime: '7 min read',
    content: `
<h2>What is a content gap analysis?</h2>
<p>A content gap analysis is the process of finding topics, keywords, and entities your competitors rank for that you don't cover — or don't cover well enough. The "gap" is the difference between what your audience is searching for and what your site currently provides.</p>
<p>It's one of the highest-ROI activities in SEO because it tells you exactly where to invest your content effort. Instead of guessing what to write, you're filling proven demand that your competitors have already validated.</p>

<h2>Three types of content gaps</h2>

<h3>1. Keyword gaps</h3>
<p>Keywords your competitors rank for in positions 1–10 that you either don't rank for or rank outside the top 20. These represent direct opportunities where there's proven search demand and your competitors have demonstrated it's achievable.</p>

<h3>2. Topic gaps</h3>
<p>Broader subject areas your competitors cover in depth that you haven't addressed at all. A competitor might have a full "SEO for e-commerce" section with ten interlinked articles while you have none — that's a topic gap, not just a keyword gap.</p>

<h3>3. Entity gaps</h3>
<p>Specific entities — people, tools, concepts, organisations — that an authoritative resource on your topic would naturally cover. If your article on "content marketing tools" doesn't mention HubSpot, Ahrefs, or Semrush, AI models and Google may judge it as incomplete.</p>

<h2>Step-by-step content gap analysis process</h2>

<h3>Step 1: Define your comparison set</h3>
<p>Choose 3–5 competitors to analyse. These should be:</p>
<ul>
  <li><strong>Direct search competitors</strong> — sites that consistently appear in SERPs for your target keywords, even if they're not business competitors</li>
  <li><strong>Similar domain authority</strong> — sites in a comparable range to yours (±20 DA points) are more useful benchmarks than major publications</li>
  <li><strong>Focused on the same audience</strong> — a site writing for CMOs and one writing for solo bloggers have different content strategies even if they cover similar topics</li>
</ul>

<h3>Step 2: Map the competitor content landscape</h3>
<p>For each competitor, identify:</p>
<ul>
  <li>Their top-performing pages by estimated organic traffic</li>
  <li>The keyword clusters those pages target</li>
  <li>Topic categories they cover consistently</li>
  <li>The content types performing best (guides, comparison pages, case studies, tools)</li>
</ul>

<h3>Step 3: Audit your own content</h3>
<p>Before comparing, know what you have. Export all your indexed pages and tag them by topic. Look for:</p>
<ul>
  <li>Topics with thin coverage (one short article vs. a competitor's in-depth hub)</li>
  <li>High-priority keywords where you rank positions 11–20 (close to the first page — worth updating)</li>
  <li>Content that's outdated or hasn't been touched in 18+ months</li>
</ul>

<h3>Step 4: Identify the gaps</h3>
<p>Compare your content map against your competitors'. The gaps fall into three buckets:</p>
<ul>
  <li><strong>Not covered at all</strong> — topics competitors rank for that you have zero content on</li>
  <li><strong>Covered but thin</strong> — you have an article but it's 500 words vs. a competitor's 3,000-word comprehensive guide</li>
  <li><strong>Missing entities</strong> — your content exists but doesn't cover the key concepts, tools, or references that would make it complete</li>
</ul>

<h3>Step 5: Prioritise by opportunity</h3>
<p>Not every gap is worth filling. Prioritise based on:</p>
<ul>
  <li><strong>Search volume</strong> — higher volume gaps first</li>
  <li><strong>Keyword difficulty</strong> — gaps where competitors ranking have similar or lower authority to yours</li>
  <li><strong>Business relevance</strong> — topics that attract your target customer, not just any traffic</li>
  <li><strong>Content investment required</strong> — quick wins (adding entities to existing articles) vs. large investments (building a new content hub)</li>
</ul>

<h2>How to fill the gaps efficiently</h2>
<p>Once you've identified the gaps, there are three ways to close them:</p>
<ol>
  <li><strong>Update existing content</strong> — add missing entities, expand thin sections, add FAQ content. Often delivers faster results than creating new pages.</li>
  <li><strong>Create net-new content</strong> — for topics you have zero coverage on. Plan these as part of a topical cluster, not standalone articles.</li>
  <li><strong>Build content hubs</strong> — for large topic gaps, create a pillar page that links to multiple supporting articles. This builds topical authority faster than individual disconnected articles.</li>
</ol>

<h2>Automate the analysis</h2>
<p>Manual content gap analysis is time-consuming. Optmizly's <strong>Content Gap</strong> tool analyses your content against your topic area and surfaces specific gaps — missing entities, uncovered subtopics, and competitor content themes — in under a minute. Use it after running a content analysis to turn your score breakdown into a specific action list.</p>

<h2>How often to run a content gap analysis</h2>
<p>Content gaps change as competitors publish new content and search trends shift. A quarterly analysis is sufficient for most sites. If you're in a fast-moving niche (AI, finance, health), monthly makes sense for your highest-priority topic clusters.</p>

<h2>The bottom line</h2>
<p>Content gap analysis turns "what should I write?" from a guessing game into a data-driven process. The sites growing fastest in organic search are the ones that systematically identify and fill gaps rather than publishing random articles based on gut feel. Start with your three most important topic areas, find the five biggest gaps in each, and work through them in priority order.</p>
    `.trim(),
    published: true,
  },

  {
    slug: 'serp-analysis-why-you-are-not-ranking',
    title: 'SERP Analysis: How to Find Exactly Why You\'re Not Ranking',
    description: 'If you\'re not on page one, there\'s a specific reason. Here\'s how to do a proper SERP analysis to diagnose the gap and build a recovery plan.',
    category: 'SEO Strategy',
    tags: 'serp analysis,why not ranking,seo audit,competitor analysis,serp features',
    readingTime: '8 min read',
    content: `
<h2>Why "publish good content" isn't enough</h2>
<p>Most SEO advice boils down to "create high-quality content." That's true but useless if you don't understand why your existing content isn't ranking. The SERP for any given keyword tells you exactly what you need to do differently — if you know how to read it.</p>
<p>A SERP analysis is the process of examining the pages currently ranking for your target keyword and extracting the specific signals that explain their position. It's not about copying competitors — it's about understanding what Google has decided this query needs.</p>

<h2>Start with search intent</h2>
<p>Before analysing individual competitors, look at the SERP as a whole. What type of content dominates?</p>
<ul>
  <li><strong>Informational</strong> — long-form guides, how-tos, explainers. Searcher wants to learn.</li>
  <li><strong>Commercial</strong> — comparison pages, reviews, "best X" lists. Searcher is evaluating options.</li>
  <li><strong>Transactional</strong> — product pages, pricing pages, signup flows. Searcher is ready to act.</li>
  <li><strong>Navigational</strong> — the searcher wants a specific site or page.</li>
</ul>
<p>If the top 5 results for your target keyword are all long-form guides and you're targeting it with a product page, you're fighting the wrong battle. Google has decided this query is informational. You need informational content to rank — or you need to target a different keyword that matches your page type.</p>

<h2>The 6 things to check for each top-ranking page</h2>

<h3>1. Content depth and word count</h3>
<p>How comprehensive are the top-ranking pages? Word count alone doesn't cause rankings, but it's a proxy for depth. If the top 3 results average 3,000 words and your article is 800 words, you may simply be covering the topic less thoroughly. Look at the structure — how many H2 sections do they have? What subtopics do they cover that you don't?</p>

<h3>2. Domain and page authority</h3>
<p>What's the domain strength of the sites ranking above you? If positions 1–5 are occupied by sites with 20+ years of authority in your niche (think Moz, HubSpot, or NerdWallet in their respective domains), you may be targeting a keyword that's out of range for your current domain authority. The right move is to build authority on lower-competition related keywords first.</p>

<h3>3. Page type and URL structure</h3>
<p>Is the ranking content a blog post, a landing page, a category page, or a tool? A query dominated by tools (like "keyword density checker") won't rank a blog post in position 1, no matter how good it is. Match the page type to what the SERP rewards.</p>

<h3>4. E-E-A-T signals</h3>
<p>Do the ranking pages have clear author attribution with credentials? Are they citing primary sources? Do they demonstrate first-hand experience? If your content lacks these signals compared to what's ranking, that's a direct gap to close.</p>

<h3>5. On-page SEO fundamentals</h3>
<p>Check the basics: Does the target keyword appear in the title tag, H1, first paragraph, and URL? Are there LSI keywords and related terms naturally distributed through the content? Is the meta description compelling enough to drive clicks?</p>

<h3>6. SERP features</h3>
<p>What features appear on this SERP? Featured snippets, People Also Ask boxes, local packs, image carousels, and video results all affect click-through rates and tell you what format Google wants for this query. If there's a featured snippet, write a concise direct answer to target it. If there's a video carousel, consider whether a supporting video makes sense.</p>

<h2>Diagnosing the root cause</h2>
<p>After analysing the top results, you should be able to categorise your ranking gap into one of these root causes:</p>
<ul>
  <li><strong>Content depth gap</strong> — you cover the topic but not as thoroughly as what's ranking</li>
  <li><strong>Authority gap</strong> — your domain lacks the backlinks and reputation to compete for this keyword yet</li>
  <li><strong>Intent mismatch</strong> — your page type doesn't match what the SERP rewards for this query</li>
  <li><strong>E-E-A-T gap</strong> — your content lacks the trust and expertise signals competitors show</li>
  <li><strong>Technical gap</strong> — page speed, Core Web Vitals, or indexation issues are holding you back</li>
</ul>
<p>The root cause determines the fix. A content depth gap gets fixed by expanding your article. An authority gap gets fixed by building backlinks — or choosing a less competitive keyword in the short term. Misdiagnosing the cause leads to wasted effort.</p>

<h2>Building your recovery plan</h2>
<p>Once you've identified the root cause, build a phased plan:</p>
<ol>
  <li><strong>Phase 1 (weeks 1–4)</strong>: Fix the on-page issues you control — content depth, intent alignment, E-E-A-T signals, technical basics. These are the fastest-moving levers.</li>
  <li><strong>Phase 2 (weeks 5–10)</strong>: Build internal links from relevant pages to the target page. Strengthen topical authority by filling content gaps around the target topic.</li>
  <li><strong>Phase 3 (weeks 11–20)</strong>: Pursue external backlinks from sites with relevant authority. Promote the updated content to drive early signals.</li>
</ol>

<h2>Automate your SERP analysis</h2>
<p>Manual SERP analysis is thorough but time-consuming. Optmizly's <strong>SERP Audit</strong> tool automates the competitor breakdown — it fetches real SERP data for your keyword, analyses the top 5 competitors, identifies your specific gaps, and generates a phase-by-phase recovery plan. Run it on any keyword where you're stuck between positions 5 and 20.</p>

<h2>The bottom line</h2>
<p>You can't fix what you haven't diagnosed. "Publish more content" is the wrong answer if your problem is an authority gap. "Build more backlinks" is the wrong answer if your problem is intent mismatch. SERP analysis is the diagnostic step that makes everything else in SEO more efficient.</p>
<p>Pick your three most important keywords where you're ranking but not on page one. Run a SERP analysis on each. Find the root cause. Fix that specific thing. Repeat.</p>
    `.trim(),
    published: true,
  },

  {
    slug: 'topical-authority-what-it-is-and-how-to-build-it',
    title: 'Topical Authority: What It Is and How to Build It',
    description: 'Topical authority is how Google decides which sites are genuine experts on a subject. Here\'s what it means, why it matters, and the exact process for building it.',
    category: 'SEO Strategy',
    tags: 'topical authority,seo strategy,content strategy,pillar content,semantic seo',
    readingTime: '7 min read',
    content: `
<h2>What is topical authority?</h2>
<p>Topical authority is Google's assessment of how comprehensively and authoritatively a website covers a given subject. A site with high topical authority on, say, personal finance doesn't just have one viral article about budgeting — it has deep, interconnected coverage of budgeting, investing, tax planning, debt management, retirement, and every related subtopic, all linking to each other.</p>
<p>Google uses topical authority to decide which sites deserve to rank for competitive queries. A site with genuine topical authority can outrank a higher-DA competitor on a specific topic because Google has learned, from the breadth and depth of its coverage, that this site is a genuine expert on the subject.</p>

<h2>Why topical authority matters more than ever</h2>
<p>The shift toward topical authority accelerated with Google's Helpful Content System (2022–2023) and the core updates that followed. These updates explicitly targeted "thin" content — sites that covered many topics superficially — in favour of sites that demonstrated deep expertise in a specific domain.</p>
<p>Practically, this means:</p>
<ul>
  <li>A site that covers ten topics broadly will typically lose to ten sites that each cover one topic deeply</li>
  <li>Backlinks from authoritative sources matter less if you're missing the foundational content that establishes your expertise</li>
  <li>AI assistants like Perplexity cite sites with high topical authority more often, because they signal reliable domain expertise</li>
</ul>

<h2>The pillar and cluster model</h2>
<p>The most effective structure for building topical authority is the content hub: a pillar page supported by a cluster of interlinked subtopic articles.</p>
<ul>
  <li><strong>Pillar page</strong> — a comprehensive overview of a broad topic (e.g., "The Complete Guide to Content Marketing"). It covers all major subtopics at a high level and links to detailed cluster articles for each.</li>
  <li><strong>Cluster articles</strong> — deep dives into specific subtopics (e.g., "How to Build a Content Calendar," "Content Marketing KPIs," "B2B Content Marketing Strategy"). Each links back to the pillar and to related cluster articles.</li>
</ul>
<p>This internal link structure tells Google that these pages are all part of a coherent expertise area, not a collection of isolated articles. It also distributes PageRank efficiently within your most important topic clusters.</p>

<h2>How to identify the right topic clusters to build</h2>

<h3>Step 1: Define your core topic</h3>
<p>What is the one subject your site should own? Be specific. "Marketing" is too broad. "Email marketing for e-commerce brands" is a topic you can realistically dominate. Pick the most specific topic where your target audience overlaps with your genuine expertise.</p>

<h3>Step 2: Map the subtopics</h3>
<p>Every core topic has 8–15 major subtopics. For "email marketing for e-commerce," those might be: list building, segmentation, automations, deliverability, copywriting, design, A/B testing, analytics, and legal compliance. Each subtopic can become a cluster article or even its own mini-cluster.</p>

<h3>Step 3: Identify what you're missing</h3>
<p>Compare your current content to the full subtopic map. Which subtopics do you have zero coverage on? Which do you cover but at insufficient depth? Prioritise the gaps where your competitors have strong coverage — those are the queries you're losing to them on right now.</p>

<h3>Step 4: Build systematically</h3>
<p>Don't publish one article and move on to a different topic. Work through your cluster systematically — publish the pillar page, then build out the cluster articles one by one. Google learns your topical authority from the pattern of related content, not individual articles in isolation.</p>

<h2>The key signals Google uses to assess topical authority</h2>
<ul>
  <li><strong>Content breadth</strong> — how many of the subtopics within a domain do you cover?</li>
  <li><strong>Content depth</strong> — how thoroughly does each article cover its subtopic?</li>
  <li><strong>Internal linking</strong> — are related articles connected to each other and to the pillar page?</li>
  <li><strong>Entity coverage</strong> — does your content mention the key entities (tools, people, standards, concepts) that authoritative content on this topic would include?</li>
  <li><strong>Update frequency</strong> — is the content kept current? Stale content in fast-moving niches signals reduced authority.</li>
</ul>

<h2>Common mistakes that undermine topical authority</h2>
<ul>
  <li><strong>Topic dilution</strong> — publishing content on unrelated subjects breaks the topical signal. A personal finance site that starts covering travel or fitness is diluting its authority.</li>
  <li><strong>Thin cluster articles</strong> — cluster articles that are 300-word stubs don't add authority. Each piece needs to be genuinely useful and comprehensive for its specific subtopic.</li>
  <li><strong>Orphan pages</strong> — articles with no internal links from the pillar or other cluster pages don't contribute to topical authority. Every cluster article should be reachable within 2 clicks from your pillar page.</li>
  <li><strong>Ignoring entity gaps</strong> — if your content never mentions the key tools, people, and concepts in your niche, it signals inexperience to both Google and AI models.</li>
</ul>

<h2>How to measure your topical authority</h2>
<p>There's no single "topical authority score" in Google Search Console. But you can proxy it by tracking:</p>
<ul>
  <li>Average ranking position across your target keyword cluster</li>
  <li>Number of unique keywords your site ranks for in your core topic area</li>
  <li>Click-through rate on core topic queries (high CTR signals Google is presenting you as a trusted result)</li>
</ul>
<p>Optmizly's <strong>Topical Authority Mapper</strong> analyses your niche and generates a full map of the content clusters you need to build, the subtopics you're missing, and a prioritised plan for closing the gaps.</p>

<h2>The bottom line</h2>
<p>Topical authority is the long game of SEO. You don't build it with one article or one backlink campaign — you build it by becoming the most complete resource on a specific subject and maintaining that position over time. The sites that do this well tend to be remarkably resistant to algorithm updates, because they're doing exactly what Google says it wants to reward: genuine expertise, comprehensive coverage, and real helpfulness for readers in a specific domain.</p>
<p>Pick your core topic. Map your clusters. Fill the gaps systematically. That's the whole strategy.</p>
    `.trim(),
    published: true,
  },
  {
    slug: 'on-page-seo-checklist',
    title: 'On-Page SEO Checklist: Everything You Need to Rank in 2025',
    description: 'A complete on-page SEO checklist covering title tags, headings, meta descriptions, keyword usage, internal links, and more — with specific guidance for each element.',
    category: 'SEO Fundamentals',
    tags: 'on-page seo,seo checklist,title tags,meta description,keyword optimization',
    readingTime: '9 min read',
    content: `
<h2>What is on-page SEO?</h2>
<p>On-page SEO refers to the optimisations you make directly on your web pages — as opposed to off-page factors like backlinks or technical factors like site speed. It's the layer of SEO you have the most direct control over, and it's often where the fastest gains come from.</p>
<p>This checklist covers every major on-page element, what best practice looks like for each, and the most common mistakes to avoid.</p>

<h2>Title tag</h2>
<p>The title tag is the single most important on-page element. It appears as the clickable headline in search results and is a strong ranking signal.</p>
<ul>
  <li><strong>Length:</strong> 50–60 characters. Longer titles get truncated in search results.</li>
  <li><strong>Keyword placement:</strong> Put your primary keyword near the front of the title.</li>
  <li><strong>Uniqueness:</strong> Every page on your site should have a unique title tag. Duplicate titles confuse search engines about which page to rank.</li>
  <li><strong>Brand suffix:</strong> For most pages, append your brand name at the end: "How to Do Keyword Research | Optmizly"</li>
  <li><strong>Avoid keyword stuffing:</strong> "Keyword Research, Keyword Research Tips, Best Keyword Research Tool" is not a title — it's a red flag.</li>
</ul>

<h2>Meta description</h2>
<p>Meta descriptions don't directly affect rankings, but they significantly affect click-through rate — which does affect rankings indirectly.</p>
<ul>
  <li><strong>Length:</strong> 150–160 characters. Anything longer gets truncated.</li>
  <li><strong>Include the keyword:</strong> Google bolds matching terms in the snippet, making your result stand out.</li>
  <li><strong>Write for clicks:</strong> Your meta description is an ad for your page. Include a clear value proposition and a soft CTA ("Learn how...", "Find out...", "Get the full list...").</li>
  <li><strong>Don't duplicate:</strong> Like title tags, every page needs a unique meta description.</li>
</ul>

<h2>H1 heading</h2>
<ul>
  <li>Every page should have exactly one H1.</li>
  <li>The H1 should contain your primary keyword and closely match your title tag — but doesn't have to be identical.</li>
  <li>Make it descriptive and specific. "Introduction" or "Welcome" are not H1s — they're wasted opportunities.</li>
</ul>

<h2>Heading structure (H2–H6)</h2>
<p>Headings help both readers and search engines understand your content structure. Think of them as a table of contents.</p>
<ul>
  <li>Use H2s for major sections, H3s for subsections within those sections.</li>
  <li>Include secondary keywords and related terms naturally in your H2s.</li>
  <li>Write headings as if they're answering a question — this increases the chance of being featured in People Also Ask boxes and AI answers.</li>
  <li>Don't skip levels (H1 → H3 with no H2) — this breaks the logical hierarchy.</li>
</ul>

<h2>Keyword usage</h2>
<ul>
  <li><strong>Primary keyword:</strong> Should appear in the title, H1, first paragraph, at least one H2, and naturally throughout the body.</li>
  <li><strong>Keyword density:</strong> There's no magic percentage. 1–2% is a rough benchmark, but natural usage matters more than hitting a number.</li>
  <li><strong>LSI keywords:</strong> Include semantically related terms — synonyms, related concepts, and terms that appear in competitor content on the same topic.</li>
  <li><strong>Avoid stuffing:</strong> If you have to force your keyword into a sentence, it doesn't belong there. Stuffing hurts more than it helps.</li>
</ul>

<h2>Content length and depth</h2>
<p>Length is a proxy for depth — not a ranking factor in itself. The right length for your content is whatever it takes to thoroughly answer the searcher's question.</p>
<ul>
  <li>Check the average word count of pages ranking in the top 5 for your target keyword.</li>
  <li>Cover all the subtopics those pages cover — and ideally something they don't.</li>
  <li>Don't pad. A tight 800-word article beats a bloated 3,000-word one with 2,000 words of filler.</li>
</ul>

<h2>URL structure</h2>
<ul>
  <li>Keep URLs short and descriptive: <code>/on-page-seo-checklist</code> not <code>/blog/2025/04/01/complete-guide-to-on-page-seo-tips-and-tricks</code></li>
  <li>Include your primary keyword in the URL.</li>
  <li>Use hyphens to separate words, not underscores.</li>
  <li>Avoid stop words (a, the, and, of) where they add length without adding meaning.</li>
  <li>Once a URL is indexed, don't change it without a 301 redirect.</li>
</ul>

<h2>Images</h2>
<ul>
  <li><strong>Alt text:</strong> Every image should have descriptive alt text. Include your keyword where it makes sense, but don't force it on every image.</li>
  <li><strong>File names:</strong> Use descriptive file names (<code>on-page-seo-checklist.png</code>) rather than <code>IMG_4821.png</code>.</li>
  <li><strong>File size:</strong> Compress images before uploading. Large images are a leading cause of slow page speed.</li>
  <li><strong>Lazy loading:</strong> Ensure images below the fold load lazily to improve Core Web Vitals.</li>
</ul>

<h2>Internal links</h2>
<ul>
  <li>Link to other relevant pages on your site using descriptive anchor text (not "click here" or "read more").</li>
  <li>Every important page should be reachable within 3 clicks from your homepage.</li>
  <li>When you publish a new page, go back and add internal links to it from existing relevant pages.</li>
  <li>Internal links distribute PageRank and help search engines understand the relationship between your pages.</li>
</ul>

<h2>External links</h2>
<ul>
  <li>Link out to credible, authoritative sources when you reference data, studies, or claims.</li>
  <li>External links signal that your content is well-researched — they don't "leak" PageRank in a way that hurts you.</li>
  <li>Open external links in a new tab (<code>target="_blank"</code>) and add <code>rel="noopener noreferrer"</code> for security.</li>
</ul>

<h2>Schema markup</h2>
<p>Schema markup (structured data) helps search engines understand your content and can enable rich results in SERPs.</p>
<ul>
  <li><strong>Article schema:</strong> For blog posts and news articles.</li>
  <li><strong>FAQPage schema:</strong> For pages with FAQ sections — can generate expandable FAQ results directly in SERPs.</li>
  <li><strong>HowTo schema:</strong> For step-by-step guides.</li>
  <li><strong>BreadcrumbList schema:</strong> Displays breadcrumb navigation in search results.</li>
</ul>

<h2>Page speed and Core Web Vitals</h2>
<p>Page experience is a confirmed ranking factor. Key metrics:</p>
<ul>
  <li><strong>LCP (Largest Contentful Paint):</strong> Should be under 2.5 seconds. Usually affected by image size and server response time.</li>
  <li><strong>CLS (Cumulative Layout Shift):</strong> Should be under 0.1. Caused by elements that move after initial load (ads, late-loading fonts, images without dimensions).</li>
  <li><strong>INP (Interaction to Next Paint):</strong> Should be under 200ms. Affected by JavaScript execution time.</li>
</ul>

<h2>Mobile optimisation</h2>
<ul>
  <li>Google uses mobile-first indexing — your mobile page is the one that gets ranked.</li>
  <li>Test your page on a real mobile device, not just a desktop browser with a narrow viewport.</li>
  <li>Ensure tap targets (buttons, links) are at least 48x48 pixels.</li>
  <li>Don't use intrusive interstitials (pop-ups that block content on mobile).</li>
</ul>

<h2>How to audit your on-page SEO</h2>
<p>Running through this checklist manually for every page is time-consuming. Optmizly's <strong>On-Page SEO</strong> tool audits your content against all these criteria automatically — it checks keyword usage, heading structure, meta tags, image alt text, and readability, then gives you a prioritised list of fixes.</p>

<h2>The bottom line</h2>
<p>On-page SEO isn't glamorous, but it's the foundation everything else is built on. A technically sound page with good on-page optimisation will consistently outperform a poorly optimised page with better backlinks — especially in competitive niches where the margin between page 1 and page 2 is often a handful of small improvements.</p>
<p>Work through this checklist for your most important pages first. Fix the highest-impact items, republish, and monitor your rankings over the next 4–6 weeks.</p>
    `.trim(),
    published: true,
  },

  {
    slug: 'how-to-rank-in-ai-overviews',
    title: 'How to Rank in AI Overviews: What Google\'s AI Search Means for Your Content',
    description: 'Google\'s AI Overviews appear above organic results for millions of queries. Here\'s how they work and what you need to do to get your content featured.',
    category: 'AI Search',
    tags: 'ai overviews,google sge,ai search,featured snippets,seo 2025',
    readingTime: '7 min read',
    content: `
<h2>What are Google AI Overviews?</h2>
<p>Google AI Overviews (formerly Search Generative Experience, or SGE) are AI-generated summaries that appear at the top of search results for certain queries. Instead of showing a list of blue links, Google synthesises information from multiple sources into a direct answer — with citations to the pages it drew from.</p>
<p>For the pages cited, AI Overviews can drive significant traffic. For pages that aren't cited, the overview often absorbs the click that would have gone to position 1. Understanding how to get featured is now a core part of SEO strategy.</p>

<h2>Which queries trigger AI Overviews?</h2>
<p>AI Overviews appear most frequently for:</p>
<ul>
  <li><strong>Informational queries</strong> — "how to", "what is", "why does", "explain" queries where someone wants to understand something</li>
  <li><strong>Complex questions</strong> — multi-part questions that require synthesising information from multiple sources</li>
  <li><strong>Research queries</strong> — product comparisons, topic overviews, "best practices for X"</li>
</ul>
<p>They appear less often for navigational queries (when someone is looking for a specific site), transactional queries (when someone is ready to buy), and very recent news where training data may be outdated.</p>

<h2>How Google selects sources for AI Overviews</h2>
<p>Google has been somewhat opaque about the exact algorithm, but analysis of which pages get cited reveals consistent patterns:</p>

<h3>High E-E-A-T signals</h3>
<p>Pages with clear author credentials, first-hand experience, and trustworthiness signals are significantly more likely to be cited. Google is especially careful about citing authoritative sources for AI Overviews because errors are more visible than they'd be in a ranked list.</p>

<h3>Direct, structured answers</h3>
<p>Pages that answer the query directly — ideally in the first paragraph, with a clear structure — are easier for Google to extract and cite. Long preambles, excessive hedging, and buried answers reduce your chances.</p>

<h3>Comprehensive topic coverage</h3>
<p>AI Overviews often synthesise from multiple pages to give a complete answer. Pages that cover a topic comprehensively (covering multiple angles, edge cases, and related questions) tend to be cited more often than thin pages covering only one aspect.</p>

<h3>Schema markup</h3>
<p>Structured data (Article, FAQPage, HowTo) helps Google understand the format and context of your content, making it easier to extract relevant chunks for AI summaries.</p>

<h3>Already ranking in top 10</h3>
<p>While not a strict requirement, the majority of AI Overview citations come from pages already ranking on page 1 for the query. Strong traditional SEO remains the foundation.</p>

<h2>7 specific things to do</h2>

<h3>1. Answer the question in the first 100 words</h3>
<p>Put the direct, concise answer to your target query in the opening paragraph. Expand with detail below. Google's extraction tends to prioritise content that appears early and that directly addresses the query.</p>

<h3>2. Add a TL;DR or summary box</h3>
<p>A clearly marked summary at the top of your article ("Key takeaways: ...") gives Google a pre-packaged extraction point. Format it as a bulleted list for easy parsing.</p>

<h3>3. Use FAQ sections</h3>
<p>FAQPage schema combined with a well-structured FAQ section is one of the highest-yield formats for AI Overview inclusion. Write questions exactly as users would phrase them, followed by direct 2–4 sentence answers.</p>

<h3>4. Cite credible external sources</h3>
<p>Pages that cite primary sources (studies, official documentation, industry data) are treated as more reliable for AI extraction. Google prefers citing sources that themselves cite sources.</p>

<h3>5. Cover related questions</h3>
<p>Use People Also Ask data to identify the follow-up questions users ask about your topic. Cover them in dedicated subsections. AI Overviews often need to address multiple related questions in a single summary, and pages that cover several get cited more.</p>

<h3>6. Improve your E-E-A-T signals</h3>
<p>Add clear author attribution with credentials, link to your about page, and ensure your content demonstrates first-hand knowledge. These signals matter more for AI Overviews than for traditional rankings.</p>

<h3>7. Optimise for featured snippets first</h3>
<p>Featured snippets and AI Overview citations overlap significantly. If you can capture featured snippets for your target queries, you're likely already in the right position for AI Overview inclusion.</p>

<h2>What to do if AI Overviews are cannibalising your traffic</h2>
<p>If you're seeing traffic drops on queries where AI Overviews now appear, you have two options:</p>
<ol>
  <li><strong>Get cited</strong> — optimise to be one of the sources the AI Overview cites. This can partially recover the traffic you're losing.</li>
  <li><strong>Shift to transactional and navigational queries</strong> — AI Overviews rarely appear for "buy X" or "X login" queries. A content strategy that drives more transactional traffic is more resistant to AI Overview displacement.</li>
</ol>

<h2>The bottom line</h2>
<p>AI Overviews represent a fundamental shift in how Google surfaces information. The sites that will thrive are those that prioritise genuine expertise, clear structured answers, and comprehensive topic coverage — which turns out to be exactly what good content has always required.</p>
<p>The tactics that get you cited in AI Overviews are the same tactics that improve your traditional rankings. Invest in both simultaneously and you'll be in a strong position regardless of how search continues to evolve.</p>
    `.trim(),
    published: true,
  },

  {
    slug: 'keyword-research-for-beginners',
    title: 'Keyword Research for Beginners: How to Find Keywords You Can Actually Rank For',
    description: 'Keyword research is the foundation of SEO. This beginner\'s guide explains how to find, evaluate, and prioritise keywords that match your content and your site\'s authority level.',
    category: 'SEO Fundamentals',
    tags: 'keyword research,seo beginners,long-tail keywords,keyword difficulty,search volume',
    readingTime: '8 min read',
    content: `
<h2>Why keyword research matters</h2>
<p>Every piece of content you create is an attempt to rank for specific search queries. Keyword research is the process of finding out which queries your target audience uses, how competitive those queries are, and which ones represent realistic opportunities for your site.</p>
<p>Without keyword research, you're guessing. With it, you can make data-driven decisions about what to write and have a realistic sense of whether your content can rank.</p>

<h2>The three things that matter in keyword research</h2>

<h3>1. Search volume</h3>
<p>Search volume is how many times a keyword is searched per month. Higher volume means more potential traffic — but also usually more competition. Don't optimise only for high-volume keywords. A keyword with 200 monthly searches that you can realistically rank #1 for is worth more than a 10,000-search keyword where you'll land on page 5.</p>

<h3>2. Keyword difficulty</h3>
<p>Keyword difficulty (KD) is an estimate of how hard it is to rank in the top 10 for a keyword, usually based on the backlink profiles of the pages currently ranking. Most SEO tools express this as a 0–100 score. As a new site, you should target keywords with KD under 30. Established sites can compete for KD 40–60. Scores above 70 require significant domain authority.</p>

<h3>3. Search intent</h3>
<p>Search intent is what the searcher actually wants when they type a query. The four main types:</p>
<ul>
  <li><strong>Informational</strong> — they want to learn ("how to do keyword research")</li>
  <li><strong>Commercial</strong> — they're evaluating options ("best keyword research tools")</li>
  <li><strong>Transactional</strong> — they want to buy or sign up ("keyword research tool free trial")</li>
  <li><strong>Navigational</strong> — they want a specific site ("Ahrefs login")</li>
</ul>
<p>Your page type must match the intent. A blog post can't rank for a transactional query. A product page can't rank for an informational query. Always check what's currently ranking for a keyword before you create content for it.</p>

<h2>Step-by-step keyword research process</h2>

<h3>Step 1: Start with seed keywords</h3>
<p>Seed keywords are broad terms that describe your business, product, or topic area. If you run a personal finance blog, your seed keywords might be: "budgeting", "investing", "saving money", "debt management", "retirement planning".</p>
<p>Don't overthink seed keywords — they're just starting points for building a longer list.</p>

<h3>Step 2: Expand with keyword modifiers</h3>
<p>Take your seed keywords and add modifiers to find more specific, longer-tail versions:</p>
<ul>
  <li><strong>Question modifiers:</strong> how to, what is, why, when, which</li>
  <li><strong>Qualifier modifiers:</strong> best, top, free, cheap, easy, for beginners, for small business</li>
  <li><strong>Comparison modifiers:</strong> vs, alternative to, instead of</li>
  <li><strong>Location modifiers:</strong> in [city], near me, UK, Australia</li>
</ul>
<p>"Budgeting" becomes "how to budget for beginners", "best budgeting apps", "budgeting vs saving", "budgeting for families" — each with different volumes, difficulties, and intents.</p>

<h3>Step 3: Check People Also Ask and related searches</h3>
<p>For any keyword you're researching, check the "People Also Ask" boxes and "Related searches" at the bottom of the SERP. These are Google telling you exactly what else users want to know about the topic — free keyword research straight from the source.</p>

<h3>Step 4: Evaluate each keyword</h3>
<p>For each keyword on your list, assess:</p>
<ul>
  <li>Monthly search volume (is there enough demand to justify the effort?)</li>
  <li>Keyword difficulty (can your site realistically rank for this?)</li>
  <li>Search intent (does this match the content you want to create?)</li>
  <li>Business relevance (will ranking for this bring the right kind of visitors?)</li>
  <li>SERP features (is there a featured snippet, AI Overview, or local pack that will reduce organic CTR?)</li>
</ul>

<h3>Step 5: Prioritise your list</h3>
<p>Score each keyword across these factors and prioritise accordingly:</p>
<ul>
  <li><strong>Quick wins first:</strong> Low KD, decent volume, high business relevance</li>
  <li><strong>Then medium-term targets:</strong> Moderate KD with high volume or very high business value</li>
  <li><strong>Long-term aspirational targets:</strong> High KD keywords you'll work toward as your domain grows</li>
</ul>

<h2>The long-tail advantage</h2>
<p>Long-tail keywords (3+ words, lower volume) are often dismissed because of their low individual search volumes. But they have significant advantages:</p>
<ul>
  <li><strong>Lower competition:</strong> Fewer sites specifically target them, so ranking is easier</li>
  <li><strong>Higher conversion intent:</strong> "best budgeting app for freelancers in the UK" shows much clearer intent than "budgeting app"</li>
  <li><strong>Faster to rank:</strong> New sites can appear on page 1 for long-tail keywords in weeks, while head terms take months or years</li>
  <li><strong>They add up:</strong> 100 long-tail keywords averaging 150 searches each is 15,000 monthly searches — comparable to a single mid-tail keyword</li>
</ul>

<h2>Common keyword research mistakes</h2>
<ul>
  <li><strong>Only targeting high-volume keywords:</strong> These take years to rank for if you're starting out. Build authority on low-competition terms first.</li>
  <li><strong>Ignoring intent:</strong> Creating informational content for transactional queries (or vice versa) guarantees failure regardless of keyword difficulty.</li>
  <li><strong>One keyword per page:</strong> A page can rank for dozens of related keywords. Don't obsess over a single keyword at the expense of covering a topic comprehensively.</li>
  <li><strong>Keyword cannibalisation:</strong> Multiple pages targeting the same keyword split your ranking potential. Consolidate or differentiate.</li>
</ul>

<h2>How to track your keyword rankings</h2>
<p>Once you've published content targeting specific keywords, you need to track whether your rankings are moving. Optmizly's <strong>Rank Tracker</strong> monitors your keyword positions over time and alerts you to significant changes — up or down. Set it up for your target keywords as soon as you publish and check monthly.</p>

<h2>The bottom line</h2>
<p>Keyword research doesn't have to be complicated. Start with seed keywords, expand them, evaluate difficulty and intent, and build a prioritised list weighted toward keywords you can realistically rank for. Create content for the easiest targets first, build authority, and work your way up to more competitive terms over time.</p>
<p>The sites that grow fastest in organic search aren't the ones chasing the biggest keywords — they're the ones systematically building authority through consistent wins on achievable targets.</p>
    `.trim(),
    published: true,
  },

  {
    slug: 'internal-linking-strategy-for-seo',
    title: 'Internal Linking Strategy for SEO: How to Do It Right',
    description: 'Internal links distribute PageRank, establish topical authority, and help search engines understand your site structure. Here\'s how to build an internal linking strategy that works.',
    category: 'SEO Strategy',
    tags: 'internal linking,seo strategy,pagerank,site structure,anchor text',
    readingTime: '7 min read',
    content: `
<h2>Why internal links matter</h2>
<p>Internal links — links from one page on your site to another — do three important things for SEO:</p>
<ol>
  <li><strong>Distribute PageRank:</strong> PageRank (Google's measure of page authority) flows through internal links. Pages with more internal links pointing to them accumulate more authority and tend to rank better.</li>
  <li><strong>Establish topical relationships:</strong> Internal links tell Google which pages are related to each other, helping it understand your site's topic structure.</li>
  <li><strong>Aid crawling and indexing:</strong> Googlebot follows links to discover new pages. A page with no internal links pointing to it (an "orphan page") is harder to discover and may not get indexed.</li>
</ol>

<h2>The pillar-cluster model revisited</h2>
<p>The most effective internal linking structure follows the pillar-cluster model:</p>
<ul>
  <li>A <strong>pillar page</strong> covers a broad topic comprehensively and links to all cluster articles on that topic</li>
  <li><strong>Cluster articles</strong> cover specific subtopics and link back to the pillar page and to related cluster articles</li>
</ul>
<p>This creates a dense network of internal links within each topic area, signalling to Google that your site is an authoritative resource on the subject. It also keeps PageRank flowing within your most important content clusters.</p>

<h2>Anchor text best practices</h2>
<p>Anchor text — the clickable words in a link — is a signal that tells Google what the linked page is about. Getting anchor text right is one of the most impactful (and most botched) parts of internal linking.</p>
<ul>
  <li><strong>Use descriptive anchor text:</strong> "Learn more about keyword research" is better than "click here" or "read more". Descriptive anchors tell both users and search engines what the destination page covers.</li>
  <li><strong>Include target keywords naturally:</strong> If you're linking to a page about keyword difficulty, using "keyword difficulty" or "how to evaluate keyword difficulty" as anchor text reinforces what that page is about.</li>
  <li><strong>Vary your anchors:</strong> Don't use the exact same anchor text for every link to the same page. Natural variation (synonyms, related phrases, partial matches) looks more organic and avoids over-optimisation signals.</li>
  <li><strong>Avoid generic anchors:</strong> "Click here", "read more", "learn more" — these anchor texts carry no topical signal. Use them sparingly and never as your primary anchor for important pages.</li>
</ul>

<h2>Where to add internal links</h2>

<h3>Body content links</h3>
<p>The most valuable internal links are those embedded naturally within your article body, where they're contextually relevant. A link within the first 100 words of an article passes more weight than one buried in the footer.</p>

<h3>Contextual callout blocks</h3>
<p>"Related reading" or "You might also like" blocks are a clean way to add internal links without forcing them into the prose. Use them at the end of major sections where a related article would be genuinely useful.</p>

<h3>Navigation and sidebars</h3>
<p>Site-wide navigation (header, footer, sidebar) passes links to every page on your site. Use these for your most important pages — your pillar pages and highest-priority tools or landing pages. Don't waste navigation slots on blog posts that don't need the PageRank.</p>

<h3>Breadcrumbs</h3>
<p>Breadcrumb navigation (Home > Blog > Category > Article) creates a chain of internal links that reinforces your site hierarchy and helps both users and search engines understand where pages sit in your structure.</p>

<h2>Finding internal linking opportunities</h2>
<p>The challenge with internal linking is that you can't link from content that doesn't exist yet. Here's a systematic process for finding opportunities in your existing content:</p>
<ol>
  <li><strong>Identify your target page</strong> — the page you want to build internal links to</li>
  <li><strong>Search your own site:</strong> <code>site:yourdomain.com "keyword"</code> in Google shows pages on your site that mention the target keyword — these are natural candidates for adding an internal link</li>
  <li><strong>Find topically related pages:</strong> Any page covering a topic closely related to your target page should link to it</li>
  <li><strong>Check orphan pages:</strong> Pages with zero internal links are invisible to Google's crawlers — find them and link to them from relevant existing content</li>
</ol>

<h2>How many internal links per page?</h2>
<p>There's no hard limit on internal links per page. Google's guidance is that you should use as many as are genuinely useful for readers. Practically:</p>
<ul>
  <li>Long-form guides (2,000+ words) might have 10–20 internal links naturally</li>
  <li>Short articles (500–800 words) might have 3–5</li>
  <li>Avoid adding links just to hit a number — forced links that don't make sense to readers are a poor user experience and a weak SEO signal</li>
</ul>

<h2>Internal linking for new content</h2>
<p>One of the most common internal linking mistakes is treating it as an afterthought. When you publish a new page:</p>
<ol>
  <li>Add internal links from the new page to 3–5 existing relevant pages</li>
  <li>Go back to 3–5 existing relevant pages and add links pointing to the new page</li>
</ol>
<p>That second step — adding links from existing content to new content — is what most people skip. It's also what helps new pages get discovered and indexed quickly.</p>

<h2>The bottom line</h2>
<p>Internal linking is one of the highest-leverage, lowest-cost SEO activities available to you. It doesn't require outreach, it doesn't cost money, and the impact compounds as your site grows. A site with 50 well-linked pages tends to significantly outperform a site with 50 isolated pages on the same topic — even if all other factors are equal.</p>
<p>Spend 30 minutes per week reviewing your most important pages and adding internal links from relevant existing content. Over time, this builds a web of topical authority that's very difficult for competitors to replicate.</p>
    `.trim(),
    published: true,
  },

  {
    slug: 'how-to-write-content-that-ranks',
    title: 'How to Write Content That Ranks: A Practical Guide',
    description: 'Writing content that ranks isn\'t about gaming algorithms — it\'s about covering a topic better than everyone else. Here\'s the framework for creating content that consistently performs.',
    category: 'SEO Fundamentals',
    tags: 'content writing,seo content,how to write for seo,content strategy,ranking content',
    readingTime: '8 min read',
    content: `
<h2>The fundamental principle</h2>
<p>Content ranks when it's the best answer to a search query. Everything else in SEO — keyword research, backlinks, technical optimisation — is either helping Google find your content or giving it enough trust signals to rank it. But if your content isn't genuinely the best result for a query, no amount of optimisation will keep it at the top.</p>
<p>This isn't a platitude. It has a practical implication: before you write a word, you need to understand what "best" means for the specific query you're targeting — and that means studying the competition.</p>

<h2>Step 1: Understand what's already ranking</h2>
<p>Before you write, search your target keyword and read the top 5 results. You're looking for:</p>
<ul>
  <li><strong>Content format:</strong> Is it a guide, a listicle, a comparison, a tool page? You need to match the dominant format.</li>
  <li><strong>Content depth:</strong> How thoroughly does each piece cover the topic? What subtopics appear in most results?</li>
  <li><strong>Content angle:</strong> What perspective or framing do most articles take? Is there a different angle that's underserved?</li>
  <li><strong>Content gaps:</strong> What important questions do the top results fail to answer? These are your opportunities to differentiate.</li>
</ul>
<p>You're not looking to copy what ranks — you're looking to understand the standard you need to meet or exceed.</p>

<h2>Step 2: Define your unique angle</h2>
<p>The easiest way to fail in SEO is to write the same article that already exists but slightly worse. If 10 articles already cover "how to do keyword research", the 11th needs a reason to exist.</p>
<p>Possible angles that differentiate:</p>
<ul>
  <li><strong>More current:</strong> If existing content is from 2021 and things have changed, a 2025 version with updated information has a clear angle</li>
  <li><strong>More specific:</strong> "Keyword research for SaaS companies" carves out an audience from the general "keyword research" pool</li>
  <li><strong>First-hand experience:</strong> If you've actually done the thing you're writing about, your specific examples and results are unique</li>
  <li><strong>More comprehensive:</strong> Cover the topic so thoroughly that nothing else needs to be read on the subject</li>
  <li><strong>Different conclusion:</strong> If all existing articles agree on X and your experience shows X is wrong, that's a valuable contrarian angle</li>
</ul>

<h2>Step 3: Create a structure before you write</h2>
<p>Good SEO content is structured before it's written. Create an outline that:</p>
<ul>
  <li>Covers all the subtopics that appear in the top-ranking pages (table stakes)</li>
  <li>Includes your unique additions or angles (differentiation)</li>
  <li>Addresses People Also Ask questions related to your keyword</li>
  <li>Progresses logically — each section builds on the previous one</li>
</ul>
<p>An hour spent on a solid outline saves three hours of rewriting.</p>

<h2>Step 4: Write for readers first</h2>
<p>The most common SEO writing mistake is writing for search engines — stuffing keywords, padding length, adding sections for the sake of it. Search engines have gotten extremely good at identifying content written for readers versus content written for algorithms, and they strongly prefer the former.</p>
<p>Write as if you're explaining something to a smart colleague who doesn't know the topic. Use:</p>
<ul>
  <li><strong>Specific examples:</strong> "For instance, when I ran this test on a 3,000-word article..." beats "content length can affect rankings"</li>
  <li><strong>Concrete numbers:</strong> "Pages loading in under 2 seconds convert 15% better" beats "fast pages perform better"</li>
  <li><strong>Active voice:</strong> "Google rewards this" beats "this is rewarded by Google"</li>
  <li><strong>Short sentences and paragraphs:</strong> Dense walls of text have high bounce rates. Online readers scan before they read.</li>
</ul>

<h2>Step 5: Include the keyword signals</h2>
<p>Once you've written for readers, add the keyword signals that help Google understand what your content is about. This is where most SEO writing advice starts — but it should come after you've nailed the fundamentals.</p>
<ul>
  <li>Primary keyword in: title, H1, first paragraph, at least one H2, URL</li>
  <li>Related keywords and LSI terms throughout the body (check what appears in competitor content)</li>
  <li>FAQ section targeting People Also Ask questions</li>
  <li>Schema markup appropriate to your content type</li>
</ul>

<h2>Step 6: Demonstrate E-E-A-T</h2>
<p>For Google to trust your content enough to rank it — especially for competitive queries — it needs signals that you know what you're talking about.</p>
<ul>
  <li>Attribute the content to a named author with a bio and credentials</li>
  <li>Include first-hand examples, case studies, or results where possible</li>
  <li>Cite credible sources for factual claims</li>
  <li>Update the content when information changes, and show the "last updated" date</li>
</ul>

<h2>Step 7: Optimise after publishing</h2>
<p>Publishing isn't the end of the process — it's the beginning of an optimisation cycle.</p>
<ol>
  <li><strong>Monitor rankings:</strong> Track your position for the target keyword. If you're not moving after 3 months, the content needs work.</li>
  <li><strong>Check Search Console:</strong> Look at which queries your page is appearing for — you may be ranking for keywords you didn't expect, which can inform updates.</li>
  <li><strong>Analyse engagement:</strong> High bounce rates and low time-on-page suggest readers aren't finding what they expected. Review the content and the search intent match.</li>
  <li><strong>Update regularly:</strong> Google favours fresh content for time-sensitive topics. Set a review schedule for your most important pages (quarterly for evergreen content, monthly for fast-moving topics).</li>
</ol>

<h2>Common content writing mistakes that hurt rankings</h2>
<ul>
  <li><strong>Intent mismatch:</strong> Writing a blog post for a query that should be a landing page (or vice versa). Always check what's ranking before you decide on format.</li>
  <li><strong>Thin content:</strong> Covering a topic in 500 words when the ranking pages average 2,500 words. Depth of coverage matters.</li>
  <li><strong>No differentiation:</strong> Writing the same article that already exists. Give people a reason to choose your page over the 10 others covering the same topic.</li>
  <li><strong>Forgetting internal links:</strong> New content should link to existing relevant content and have existing relevant content linking back to it.</li>
  <li><strong>Publishing and forgetting:</strong> Content that's never updated eventually loses rankings as competitors publish better versions.</li>
</ul>

<h2>How to analyse your content before publishing</h2>
<p>Optmizly's <strong>Content Analyser</strong> scores your content across 8 SEO dimensions — from on-page signals to E-E-A-T to LLM citation potential — and gives you a prioritised list of improvements before you hit publish. Run it on any important piece of content as a final check before it goes live.</p>

<h2>The bottom line</h2>
<p>Writing content that ranks consistently comes down to one thing: genuinely answering the searcher's question better than anyone else. The tactics — keyword placement, structure, schema, internal links — are the means, not the end. Get the fundamentals right (understand what's ranking, define your angle, write for readers, demonstrate expertise), and the technical optimisations become the polish on top of a solid foundation.</p>
    `.trim(),
    published: true,
  },
]

async function main() {
  console.log('Seeding blog posts...')
  let created = 0
  for (const post of posts) {
    try {
      await prisma.blogPost.upsert({
        where: { slug: post.slug },
        update: { ...post, publishedAt: new Date() },
        create: { ...post, publishedAt: new Date() },
      })
      console.log(`✓ ${post.title}`)
      created++
    } catch (e) {
      console.error(`✗ ${post.slug}:`, e)
    }
  }
  console.log(`\nDone — ${created}/${posts.length} posts seeded.`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
