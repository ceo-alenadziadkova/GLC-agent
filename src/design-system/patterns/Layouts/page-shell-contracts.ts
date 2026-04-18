export const PAGE_SHELL_CONTRACTS = {
  root: 'mx-auto w-full max-w-7xl',
  body: 'ds-pattern-page-shell-body',
  sectionStack: 'flex flex-col gap-8 sm:gap-10 lg:gap-12',
  /** Readable settings / profile forms inside AppShell main */
  narrowContent: 'mx-auto w-full max-w-3xl',
  /** Settings when dense tools (e.g. Question Bank Studio tab) need more horizontal room */
  settingsWideContent: 'mx-auto w-full max-w-6xl',
} as const;

export type PageShellContractKey = keyof typeof PAGE_SHELL_CONTRACTS;
