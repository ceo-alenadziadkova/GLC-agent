/**
 * BullMQ `pipeline_execution` queue defaults (job retention / retries).
 * Separate from Claude HTTP retries in `claude-client.ts` but shares the same base delay by default.
 */

import { CLAUDE_RETRY_BASE_MS } from './claude-client.js';
import { parsePositiveIntFromEnv } from './rate-limits.js';

export const PIPELINE_QUEUE_REMOVE_ON_COMPLETE = parsePositiveIntFromEnv(
  process.env.PIPELINE_QUEUE_REMOVE_ON_COMPLETE,
  1000,
);

export const PIPELINE_QUEUE_REMOVE_ON_FAIL = parsePositiveIntFromEnv(
  process.env.PIPELINE_QUEUE_REMOVE_ON_FAIL,
  1000,
);

export const PIPELINE_QUEUE_DEFAULT_ATTEMPTS = parsePositiveIntFromEnv(
  process.env.PIPELINE_QUEUE_JOB_ATTEMPTS,
  3,
);

export const PIPELINE_QUEUE_BACKOFF_DELAY_MS = parsePositiveIntFromEnv(
  process.env.PIPELINE_QUEUE_BACKOFF_DELAY_MS,
  CLAUDE_RETRY_BASE_MS,
);
