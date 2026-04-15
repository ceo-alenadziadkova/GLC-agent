/**
 * Vertical rhythm and motion delay offsets per package marketing page (Focus / Context / Strategy).
 */
export const PACKAGE_PAGE_LAYOUT = {
  focus: {
    /** Vertical rhythm between sections comes from MarketingLayout stack gap. */
    sectionGapClass: '',
    heroShellClass: 'pb-5 pt-4 sm:pb-8 sm:pt-7',
  },
  context: {
    sectionGapClass: '',
    heroShellClass: 'pb-6 pt-4 sm:pb-9 sm:pt-7',
  },
  strategy: {
    sectionGapClass: '',
    heroShellClass: 'pb-7 pt-4 sm:pb-10 sm:pt-8',
  },
} as const;

export type PackagePageTierKey = keyof typeof PACKAGE_PAGE_LAYOUT;
