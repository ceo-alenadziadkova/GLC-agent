export const SNAPSHOT_OPERATOR_TOKEN_HEADER = 'x-snapshot-operator-token' as const;

/** Infra: optional operator secret for snapshot maintenance routes (`SNAPSHOT_OPERATOR_TOKEN`). */
export function getSnapshotOperatorToken(): string {
  return process.env.SNAPSHOT_OPERATOR_TOKEN?.trim() ?? '';
}
