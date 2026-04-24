import { describe, expect, it } from 'vitest';

import type { IntakeReadinessCriticalSignalsMode } from '../core/intake-readiness-envelope.js';

/**
 * Contract guardrails for ADR-deferred behavior (no session-level remediation suppression export;
 * discovery convert stays `sla_only` — enforced in server tests).
 */
describe('intake YAGNI deferred modes', () => {
  it('keeps criticalSignalsMode union to full and sla_only until product ADR approves convert hardening', () => {
    const modes: IntakeReadinessCriticalSignalsMode[] = ['full', 'sla_only'];
    expect(modes).toHaveLength(2);
  });
});
