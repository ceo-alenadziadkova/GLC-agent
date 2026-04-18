/**
 * Client-side batching for Discovery analytics.
 */

import {
  CLIENT_ANALYTICS_FLUSH_MS_DEFAULT,
  CLIENT_ANALYTICS_MAX_BATCH_DEFAULT,
} from '../config/client-analytics-batching';

/** Debounce before flushing batched events (ms). */
export const DISCOVERY_ANALYTICS_FLUSH_MS = CLIENT_ANALYTICS_FLUSH_MS_DEFAULT;

/** Max events per POST batch. */
export const DISCOVERY_ANALYTICS_MAX_BATCH = CLIENT_ANALYTICS_MAX_BATCH_DEFAULT;
