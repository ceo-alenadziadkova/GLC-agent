export const CARD_GRID_CONTRACTS = {
  twoColumns: 'grid grid-cols-1 gap-4 md:grid-cols-2',
  threeColumns: 'grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3',
  compact: 'grid grid-cols-1 gap-3 sm:grid-cols-2',
} as const;

export type CardGridContractKey = keyof typeof CARD_GRID_CONTRACTS;
