/**
 * BullMQ `pipeline_execution` queue defaults (job retention / retries).
 */

import { SYSTEM_DEFAULTS } from './system-defaults.js';

const Q = SYSTEM_DEFAULTS.pipelineQueue;
const C = SYSTEM_DEFAULTS.claudeHttp;

export const PIPELINE_QUEUE_REMOVE_ON_COMPLETE = Q.removeOnComplete;

export const PIPELINE_QUEUE_REMOVE_ON_FAIL = Q.removeOnFail;

export const PIPELINE_QUEUE_DEFAULT_ATTEMPTS = Q.jobAttempts;

export const PIPELINE_QUEUE_BACKOFF_DELAY_MS = C.retryBaseMs;
