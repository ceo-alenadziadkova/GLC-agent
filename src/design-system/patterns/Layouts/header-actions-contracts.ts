export const HEADER_ACTIONS_CONTRACTS = {
  root: 'flex flex-wrap items-center justify-between gap-3',
  titleBlock: 'min-w-0 flex-1 space-y-1',
  actions: 'flex flex-wrap items-center gap-2',
} as const;

export type HeaderActionsContractKey = keyof typeof HEADER_ACTIONS_CONTRACTS;
