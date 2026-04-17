export const WORDING_ACTIONS = {
  publish: 'publish',
  rollback: 'rollback',
} as const;

export type WordingAction = (typeof WORDING_ACTIONS)[keyof typeof WORDING_ACTIONS];
