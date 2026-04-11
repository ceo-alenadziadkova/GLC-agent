/**
 * English copy for structured notifications emitted from snapshot routes.
 */

export const SNAPSHOT_CLAIMED_NOTIFICATION_TITLE_EN = 'Snapshot claimed' as const;
export const SNAPSHOT_CLAIMED_NOTIFICATION_MESSAGE_EN =
  'A public snapshot was linked to a registered account.' as const;

export function snapshotClaimedInAppRoute(auditId: string): string {
  return `/audit/${auditId}?brief=1`;
}
