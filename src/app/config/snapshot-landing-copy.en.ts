/**
 * Free snapshot landing — long-form explainers and phase labels (static front config / CMS-style).
 */

export type SnapshotCategoryScoreKey =
  | 'ux_clarity'
  | 'conversion_readiness'
  | 'ai_readiness'
  | 'technical_basics';

export const SNAPSHOT_LANDING_CATEGORY_HINTS: Record<SnapshotCategoryScoreKey, string> = {
  ux_clarity:
    'How clear the first screen is for someone who has never seen your brand: what you do, who it is for, primary navigation, trust signals, how easy contact is to find, and basic language/accessibility markers. The score is the share of automated UX checks that passed on the HTML we fetched (0–100)—a thin sample, not a full UX review.',
  conversion_readiness:
    'How easy it is to take the next step: strength of the main call-to-action, form labels and friction, whether pricing or commerce paths are discoverable, competing buttons in the hero, reassurance near actions, FAQs, and simple risk reducers. The number is the portion of those checks that passed in this snapshot (0–100), based only on pages we could load.',
  ai_readiness:
    'How much structured, machine-readable context we found—mainly JSON-LD (Organization, WebSite, products, offers, FAQ, breadcrumbs, etc.) that our rules expect. Higher means more of those checks passed on the sampled markup. It is not a promise about rankings or citations inside any specific AI product.',
  technical_basics:
    'Baseline technical signals in our grab: page title, viewport meta, HTTPS/canonical hints, whether the page looks indexable, Open Graph basics, informative alt text on images, and breadth of structured data. The score is the share of those checks that passed (0–100); it is not a penetration test or performance audit.',
};

export const SNAPSHOT_LANDING_COMPETITOR_COPY = {
  https: {
    tie: 'Both sites use HTTPS',
    clientWins: 'HTTPS is in use on your site',
    competitorWinsSuffix: 'uses HTTPS; check your redirect',
  },
  mobile_viewport: {
    tie: 'Both include a mobile viewport meta tag',
    clientWins: 'Your homepage declares a mobile viewport',
    competitorWinsSuffix: 'declares a mobile viewport — yours may not',
  },
  hreflang_count: {
    tie: (n: number) => `Both expose ${n} hreflang alternate(s)`,
    clientWins: (cn: number, tn: number) => `You show more hreflang alternates (${cn} vs ${tn})`,
    competitorWins: (label: string, tn: number, cn: number) =>
      `${label} shows more hreflang alternates (${tn} vs ${cn})`,
  },
  structured_data: {
    tie: 'Both homepages include JSON-LD structured data',
    clientWins: 'Your homepage includes JSON-LD structured data',
    competitorWinsSuffix: 'includes JSON-LD — yours may not',
  },
} as const;

export const SNAPSHOT_LANDING_PHASE_LABELS = [
  'Scanning homepage...',
  'Detecting tech & structure...',
  'Running rule-based checks...',
  'Building your snapshot...',
] as const;

export const SNAPSHOT_LANDING_SCORE_EXPLAINER = {
  whenHasOverall100:
    'The score out of 100 sums every rule we ran on the pages we could fetch in this snapshot—not a separate audit.',
  fivePointSuffix:
    'It reflects rule-based checks on the pages we could access—not a full consulting review.',
  fivePointPrefix: (step: number, label: string) =>
    `This ${step}/5 result (${label}) uses that same five-point band (1 = Critical … 5 = Excellent). `,
} as const;

export const SNAPSHOT_LANDING_SITE_PROFILE = {
  lowConfidenceBoth:
    (type: string, ind: string) =>
 `Signals suggest something like a ${type} in ${ind} — automatic read only, not a final label.`,
  highConfidenceBoth:
    (type: string, ind: string) => `This looks like a ${type} in ${ind} (automatic read from your pages).`,
  lowConfidenceTypeOnly:
    (type: string) => `Signals suggest a ${type}-style site — we could not pin down a specific industry automatically.`,
  highConfidenceTypeOnly:
    (type: string) => `This looks like a ${type}-style site based on visible signals.`,
  unknown: 'We could not confidently categorise this site from the sampled pages alone.',
} as const;

export const SNAPSHOT_LANDING_CLASSIFICATION_EXPLAINER = {
  tieTwoLabels:
    (chosen: string, runner: string) =>
      `Our quick scan scored "${chosen}" and "${runner}" about the same—treat this as a rough hint, not a final industry label.`,
  tieChosenOnly:
    (chosen: string) =>
      `More than one site pattern matched closely on the pages we could load—we show "${chosen}" as the closest fit.`,
  lowConfidence:
    'Confidence is low because we only sampled a few pages; a full audit can use more of your site and brief context.',
} as const;
