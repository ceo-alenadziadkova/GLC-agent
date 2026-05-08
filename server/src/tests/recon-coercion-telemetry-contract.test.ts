import { describe, expect, it } from 'vitest';
import { PIPELINE_EVENT_TYPES } from '../config/pipeline-event-types.js';

describe('recon coercion telemetry contract', () => {
  it('exposes stable event type keys for coercion diagnostics', () => {
    expect(PIPELINE_EVENT_TYPES.coercionApplied).toBe('coercion_applied');
    expect(PIPELINE_EVENT_TYPES.coercionFailed).toBe('coercion_failed');
  });
});
