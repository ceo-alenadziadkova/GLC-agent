/**
 * Canonical mapping from 1-based season index (as stored on synthesized roadmap projections)
 * onto orchestration timeline `time_bucket`. Shared by timeline projection helpers.
 */
export type OrchestrationTimelineTimeBucket = 'now' | 'next' | 'later';

export function timeBucketForSeasonIndexOneBased(seasonIndex: number): OrchestrationTimelineTimeBucket {
  if (seasonIndex <= 1) return 'now';
  if (seasonIndex === 2) return 'next';
  return 'later';
}
