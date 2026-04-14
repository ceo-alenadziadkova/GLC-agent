/**
 * Vertical rhythm and motion delay offsets per package marketing page (Focus / Context / Strategy).
 */
export const PACKAGE_PAGE_LAYOUT = {
  focus: {
    sectionGapClass: 'mt-6 sm:mt-8',
    heroShellClass: 'pb-5 pt-4 sm:pb-8 sm:pt-7',
  },
  context: {
    sectionGapClass: 'mt-7 sm:mt-10',
    heroShellClass: 'pb-6 pt-4 sm:pb-9 sm:pt-7',
  },
  strategy: {
    sectionGapClass: 'mt-8 sm:mt-10',
    heroShellClass: 'pb-7 pt-4 sm:pb-10 sm:pt-8',
  },
} as const;

export type PackagePageTierKey = keyof typeof PACKAGE_PAGE_LAYOUT;
