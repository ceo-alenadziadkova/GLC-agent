import { DOMAIN_KEYS } from '../data/auditTypes';

export const STRATEGY_LAB_DEFAULT_BENCHMARK_PERIOD = 'last_90d' as const;

/** In-page anchors for Strategy Lab sticky section navigation (`/strategy/:id`). */
export const STRATEGY_LAB_PAGE_ANCHORS = {
  /** IA phase 1: benchmarks + constraint overrides (consultant reference region). */
  definePhase: 'strategy-lab-define-phase',
  /** IA phase 2: orchestrator + initiatives + dependency map. */
  shapePack: 'strategy-lab-shape-pack',
  /** IA phase 3: manifest snapshot, build pack, previews. */
  planSetup: 'strategy-lab-plan-setup',
  /** Primary scroll container for the inspect column (legacy jump target). */
  inspectPack: 'strategy-lab-inspect-pack',
  /** Accordion anchor inside define phase (peer benchmarks disclosure). */
  reference: 'strategy-lab-reference',
} as const;

export const STRATEGY_LAB_LAYOUT_POLICY = {
  /**
   * Below this width consultants use the Sheet plan summary instead of `ResizablePanel`.
   * Keeps readable orchestrator + roadmap preview in roughly 650–1024px where split panes cram.
   */
  packSummarySheetMaxWidthPx: 1024,
  sidebarLayoutAutoSaveId: 'strategy-lab:summary-layout',
  summaryPanelDefaultSizePct: 28,
  summaryPanelMinSizePct: 20,
  summaryPanelMaxSizePct: 42,
  mainPanelMinSizePct: 44,
  /**
   * Fixed horizontal split on mobile (resize handle hidden). Slightly wider than desktop default
   * share so roadmap preview and node detail stay readable; main column keeps ~66%.
   */
  summaryPanelMobileFixedSizePct: 34,
} as const;

/**
 * Initiative `domain` values (keep aligned with `server/src/config/strategy-initiative-policy.ts` STRATEGY_INITIATIVE_DOMAIN_KEYS).
 */
export const STRATEGY_LAB_INITIATIVE_DOMAIN_KEYS = [
  ...DOMAIN_KEYS,
  'cross_domain',
  'operations',
  'finance',
  'sales',
  'customer_success',
] as const;

export type StrategyLabInitiativeDomain = (typeof STRATEGY_LAB_INITIATIVE_DOMAIN_KEYS)[number];

export const STRATEGY_LAB_DOMAIN_FILTER_ALL = 'all' as const;

export type StrategyLabDomainFilter = typeof STRATEGY_LAB_DOMAIN_FILTER_ALL | StrategyLabInitiativeDomain;

/** Client-only sort modes for initiative cards. */
export const STRATEGY_LAB_SORT_MODES = ['impact', 'effort', 'roi', 'domain'] as const;

export type StrategyLabSortMode = (typeof STRATEGY_LAB_SORT_MODES)[number];

/** Weights for ROI-like ordering (mirror server STRATEGY_INITIATIVE_SORT_WEIGHTS). */
export const STRATEGY_LAB_ROI_SORT_WEIGHTS = {
  impactHigh: 4,
  impactMedium: 2,
  impactLow: 1,
  effortLowBonus: 3,
  effortMediumBonus: 1,
  effortHighBonus: 0,
  criticalPriorityBonus: 2,
  highPriorityBonus: 1,
} as const;

/** Must match `STRATEGY_EXECUTION_PACK_LIMITS.maxInitiativesPerRequest` on the server. */
export const STRATEGY_LAB_EXECUTION_PACK_POLICY = {
  maxInitiativesPerRequest: 5,
} as const;

/** Horizons shown in Strategy Lab tabs and in roadmap export section order. */
export const STRATEGY_LAB_ROADMAP_TIMEFRAMES = ['quick', 'medium', 'strategic'] as const;

export type StrategyLabRoadmapTimeframe = (typeof STRATEGY_LAB_ROADMAP_TIMEFRAMES)[number];

/**
 * Client-side Markdown export: filenames, slug limits, MIME (static product policy — not ENV).
 */
export const STRATEGY_LAB_ROADMAP_EXPORT_POLICY = {
  markdownDownloadMimeType: 'text/markdown;charset=utf-8',
  fileNameStem: 'roadmap',
  fileExtension: 'md',
  /** `toISOString()` slice length for YYYY-MM-DD. */
  isoDatePrefixChars: 10,
  companySlugMaxChars: 48,
  auditIdFallbackPrefixChars: 8,
  dependenciesListJoiner: ', ',
  /** Leading `www.` on hostname before slugging (filename-safe). */
  hostnameStripLeadingPattern: /^www\./i,
  slugNonWordClassPattern: /[^\p{L}\p{N}]+/gu,
  slugEdgeHyphenTrimPattern: /^-+|-+$/g,
  hostnameFilenameSafePattern: /[^\w.-]+/g,
} as const;
