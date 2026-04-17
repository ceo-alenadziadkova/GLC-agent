export const SECTION_SHELL_CONTRACTS = {
  root: 'ds-pattern-section-shell-root',
  heading: 'mb-3 flex items-center justify-between gap-3 sm:mb-4',
  content: 'space-y-3 sm:space-y-4',
} as const;

export type SectionShellContractKey = keyof typeof SECTION_SHELL_CONTRACTS;
