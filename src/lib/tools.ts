/**
 * The canonical tool list: one entry here is one tool, and nothing else counts.
 *
 * Lived in src/app/dashboard/layout.tsx until 2026-09-25, which is a `'use client'` module
 * importing Clerk and PostHog — so marketing copy could not read it without pulling the whole
 * dashboard into the homepage bundle, and every count on the site was typed by hand instead.
 * Three of them were wrong for two weeks: the homepage said 23 tools in its metadata, its
 * OpenGraph description and a rendered stat, while this array held 24.
 *
 * Icons are not here on purpose. They are keyed by `id` in the dashboard's own NavIcon, which
 * keeps this file plain data that any server component can import.
 */
export type ToolMinPlan = 'FREE' | 'PRO' | 'AGENCY'

export type Tool = {
  id: string
  label: string
  href: string
  /** The lowest plan that unlocks it. Gating reads UNLOCKED_BY, not this — see CLAUDE.md on
   *  why access is never a rank comparison; this is for grouping and counting. */
  minPlan: ToolMinPlan
}

export type ToolGroup = { label: string; tools: Tool[] }

export const TOOL_GROUPS: ToolGroup[] = [
  {
    label: 'Free',
    tools: [
      { id: 'content-analyzer', label: 'Content Analyzer', href: '/dashboard',                   minPlan: 'FREE'   },
      { id: 'onpage',           label: 'On-Page SEO',      href: '/dashboard/onpage',            minPlan: 'FREE'   },
    ],
  },
  {
    label: 'Pro',
    tools: [
      { id: 'ideas',           label: 'Content Planner',   href: '/dashboard/ideas',            minPlan: 'PRO' },
      { id: 'keyword-tool',    label: 'Keyword Research',  href: '/dashboard/keyword-tool',     minPlan: 'PRO' },
      { id: 'rank-tracker',    label: 'Rank Tracker',      href: '/dashboard/rank-tracker',     minPlan: 'PRO' },
      { id: 'competitor-spy',  label: 'Competitor Spy',    href: '/dashboard/competitor-spy',   minPlan: 'PRO' },
      { id: 'optimizer',       label: 'Content Optimizer', href: '/dashboard/optimizer',        minPlan: 'PRO' },
      { id: 'eeat',            label: 'E-E-A-T Analysis',  href: '/dashboard/eeat',             minPlan: 'PRO' },
      { id: 'gap',             label: 'Content Gap',       href: '/dashboard/gap',              minPlan: 'PRO' },
      // Renamed from "AI Visibility". That name now belongs to the Agency tool that measures
    // whether AI answers actually name you; this one writes a plan for getting named, which is
    // what it always did. Two tools cannot both be called AI Visibility, and the advice tool is
    // the one whose name was the promise it could not keep.
    { id: 'citation',        label: 'AI Citation Plan',  href: '/dashboard/citation',         minPlan: 'PRO' },
      { id: 'backlinks',       label: 'Backlinks',         href: '/dashboard/backlinks',        minPlan: 'PRO' },
      { id: 'ranking-engine', label: 'Ranking Engine',    href: '/dashboard/ranking-engine',   minPlan: 'PRO' },
    ],
  },
  {
    label: 'Agency',
    tools: [
      { id: 'seo-audit',         label: 'SEO Audit',            href: '/dashboard/seo-audit',         minPlan: 'AGENCY' },
      { id: 'local-seo',         label: 'Local SEO Suite',      href: '/dashboard/local-seo',         minPlan: 'AGENCY' },
      { id: 'serp',              label: 'SERP Audit',           href: '/dashboard/serp',              minPlan: 'AGENCY' },
      { id: 'topical',           label: 'Topical Authority',    href: '/dashboard/topical',           minPlan: 'AGENCY' },
      { id: 'local',             label: 'Local SEO',            href: '/dashboard/local',             minPlan: 'AGENCY' },
      { id: 'tracker',           label: 'Cite Tracker',         href: '/dashboard/tracker',           minPlan: 'AGENCY' },
      { id: 'performance-fixer', label: 'Performance Fixer',    href: '/dashboard/performance-fixer', minPlan: 'AGENCY' },
      { id: 'client-reports',    label: 'Client Reports',       href: '/dashboard/agency/clients',    minPlan: 'AGENCY' },
      { id: 'geogrid',           label: 'Geogrid + Review Velocity', href: '/dashboard/tools/geogrid',   minPlan: 'AGENCY' },
      { id: 'ai-regex',          label: 'AI Regex',             href: '/dashboard/tools/ai-regex',    minPlan: 'AGENCY' },
      { id: 'client-finder',     label: 'SEO Client Finder',    href: '/dashboard/tools/client-finder', minPlan: 'AGENCY' },
      { id: 'ai-visibility',     label: 'AI Visibility',        href: '/dashboard/tools/ai-visibility', minPlan: 'AGENCY' },
    ],
  },
]

/** Every tool, flattened. */
export const ALL_TOOLS: Tool[] = TOOL_GROUPS.flatMap(g => g.tools)

/**
 * What the platform's size actually is — the number to quote in marketing copy.
 *
 * Derived, never typed. Adding a tool moves every surface that reads this, which is the whole
 * reason the list moved out of the dashboard layout.
 */
export const TOOL_COUNT = ALL_TOOLS.length

/**
 * Tools unlocked *at* each tier, not cumulatively: 2 free, then 10 more, then 12 more.
 *
 * The homepage prints this as a breakdown under the total, and a breakdown that does not sum
 * to the number above it is worse than no breakdown. Deriving both from one array is what
 * makes that impossible.
 */
export const TOOLS_ADDED_AT = {
  FREE: ALL_TOOLS.filter(t => t.minPlan === 'FREE').length,
  PRO: ALL_TOOLS.filter(t => t.minPlan === 'PRO').length,
  AGENCY: ALL_TOOLS.filter(t => t.minPlan === 'AGENCY').length,
} as const
