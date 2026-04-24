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
    'Baseline technical signals in our grab: page title, viewport meta, HTTPS/canonical hints, whether the page looks indexable, Open Graph basics, informative alt text on images, and breadth of structured data. The score is the share of those checks that passed (0–100); it is not a penetration test or a full technical review.',
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
    'The score out of 100 sums every rule we ran on the pages we could fetch in this snapshot—not a separate deep review.',
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
    'Confidence is low because we only sampled a few pages; a deeper workspace path can use more of your site and brief context.',
} as const;

export const SNAPSHOT_LANDING_HERO_COPY = {
  homeAriaLabel: 'Go to home page',
  signedInFallback: 'Signed in',
  workspaceLink: 'Workspace',
  signInLink: 'Sign in',
  quickRuleBasedScanBadge: 'Instant clarity check',
  websiteFieldLabel: 'Your website',
  websiteInputPlaceholder: 'yourcompany.com',
  titleLead: 'Bring your business URL. Get',
  titleAccent: 'clear ways forward',
  subtitle:
    'Get a fast, plain-language clarity read: what matters now, what blocks momentum, and where to move first.',
  ctaStart: 'Building direction...',
  ctaIdle: 'Get clarity on my website',
  rateLimitUsagePrefix: 'Free checks left today on this connection:',
  quotaTitle: 'Today on this connection',
  quotaFootnote: 'Rolling 24-hour limit from this connection.',
  runningHint: 'Usually takes a few seconds to about half a minute',
  runningTitle: 'Understanding your website context',
  runningLoaderText: 'Building your direction, please wait',
  accessLimitedSample: 'Preview limited — inner pages sampled',
  accessLimitedRobots: 'Preview limited — robots.txt policy',
  accessIncomplete: 'Preview incomplete — pages not loaded',
  readyBadge: 'Your check is ready',
  homepageSnippetTitle: 'From your homepage',
  homepageSnippetFootnote:
    'Taken from the HTML we fetched: page title, meta description, Open Graph text, or the first substantive paragraph when those are missing.',
  siteReadAdvisoryTitle: 'Site read (advisory)',
  scanConfidencePrefix: 'Scan confidence:',
  classificationConfidencePrefix: 'Classification confidence:',
  remainingQuotaSuffix: 'left',
  detectedSignalsTitle: 'Detected on your pages (this scan)',
  topIssuesTitle: 'Top Issues',
  quickWinsTitle: 'Quick Wins',
  techStackTitle: 'Tech stack detected',
  tentativeTechTitle:
    'Possibly also (weak signals — this quick scan only reads initial HTML; frameworks inside bundles may not be fingerprinted)',
  snapshotScoreLabel: 'Snapshot score',
  summaryLabel: 'Summary',
  categoryBreakdownLabel: 'Category breakdown',
  basedOnLabel: 'Based on:',
  categoryLabels: {
    uxClarity: 'UX clarity',
    conversionReadiness: 'Conversion readiness',
    aiReadiness: 'AI readiness',
    technicalBasics: 'Technical basics',
  },
  neuralVisibilityTitle: 'Neural-network visibility',
  fullPictureTitle: 'Want the full picture?',
  fullPictureBody:
    'Move from a quick check to deeper workspace paths: Focus (1 front), Context (2-3 fronts), or Strategy (all fronts) with coordinated next moves.',
  analyzeAnotherUrl: 'Check another URL',
  viewProPackageCta: 'View Pro package',
  aiVisibilityGapsIntroParagraph:
    'For your site, how you expose crawl rules, discovery, and machine-readable facts looks like it needs improvement. Have your web or SEO owner verify the live setup—not generic best practice, but how it is wired for you:',
  aiVisibilityDoThisNextParagraph:
    'Do this next: fix what applies, then line it up with Quick wins and Top issues above.',
  aiVisibilityNoGapsParagraph:
    'On a quick read we did not flag critical gaps for AI/search-facing signals on your side. Still worth your web or SEO owner confirming robots, sitemap, and structured data match how you actually operate.',
  narrowSnapshotOnlyPrefix: 'Narrow snapshot only.',
  continueWithBriefLabel: 'Continue with Brief',
  narrowSnapshotSpecialistSuffix: 'to choose the right coverage path with a specialist.',
  footerDisclaimer: 'Results are AI-generated and for informational purposes only.',
  footerWorkspace: 'Open workspace',
  footerSignIn: 'Sign in',
  footerNoWebsite: 'No website yet?',
  footerDiscoveryLink: 'Try our discovery flow',
  footerDiscoverySuffix: '— get a free tech-maturity check without a URL.',
} as const;
