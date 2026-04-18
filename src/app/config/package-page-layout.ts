/**
 * Vertical rhythm, motion delay, and per-tier visual density for Focus / Context / Strategy
 * package marketing pages. Values drive `.ds-marketing-*` classes + Phosphor icon anchors.
 */

/** Outcome grid shapes express tier heft without overloading the layout. */
export type PackageOutcomeLayout = 'equal' | 'highlighted-left' | 'center-keystone';

export const PACKAGE_PAGE_LAYOUT = {
  focus: {
    /** Added onto MarketingSection — extends/contracts the parent flex-gap cadence. */
    sectionGapClass: '',
    heroShellClass: 'pb-5 pt-4 sm:pb-8 sm:pt-7',
    /** Applied to hero h1 alongside existing title class. Keeps Focus lighter. */
    heroTitleScaleClass: '',
    outcomeLayout: 'equal' as PackageOutcomeLayout,
  },
  context: {
    sectionGapClass: '',
    heroShellClass: 'pb-6 pt-4 sm:pb-9 sm:pt-7',
    heroTitleScaleClass: '',
    outcomeLayout: 'highlighted-left' as PackageOutcomeLayout,
  },
  strategy: {
    sectionGapClass: '',
    heroShellClass: 'pb-7 pt-4 sm:pb-10 sm:pt-8',
    /** Strategy gets the display-hero class for strongest visual weight. */
    heroTitleScaleClass: 'ds-marketing-display-hero',
    outcomeLayout: 'center-keystone' as PackageOutcomeLayout,
  },
} as const;

export type PackagePageTierKey = keyof typeof PACKAGE_PAGE_LAYOUT;
