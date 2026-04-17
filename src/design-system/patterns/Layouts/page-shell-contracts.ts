export const PAGE_SHELL_CONTRACTS = {
  root: 'mx-auto w-full max-w-7xl',
  body: 'ds-pattern-page-shell-body',
  sectionStack: 'flex flex-col gap-8 sm:gap-10 lg:gap-12',
} as const;

export type PageShellContractKey = keyof typeof PAGE_SHELL_CONTRACTS;
