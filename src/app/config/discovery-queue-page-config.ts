/**
 * Discovery queue page — truncation, preview limits, and query cache policy.
 */

import { GLC_QUERY_STALE_TIME_MS_LONG_ADMIN_LISTS } from './query-client-defaults';

export const DISCOVERY_QUEUE_PAGE_CONFIG = {
  staleTimeMs: GLC_QUERY_STALE_TIME_MS_LONG_ADMIN_LISTS,
  /** Max characters before ellipsis in business description preview. */
  bizDescriptionPreviewMaxChars: 120,
  /** Slice length when truncating (room for ellipsis). */
  bizDescriptionPreviewSliceChars: 117,
  /** Number of findings shown per session card. */
  findingsPreviewCount: 3,
  /** Public discovery wizard path (relative to origin). */
  publicDiscoveryPath: '/discovery',
} as const;
