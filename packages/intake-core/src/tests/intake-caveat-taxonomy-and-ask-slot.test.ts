import { describe, expect, it } from 'vitest';

import { INTAKE_READINESS_CAVEAT_TAXONOMY } from '../config/intake-caveat-taxonomy.js';
import { evaluateIntakeReadinessEnvelope } from '../core/intake-readiness-envelope.js';
import { applySequencingPilotToPlan } from '../core/intake-plan/apply-sequencing-pilot.js';
import { currentIntakeVersionTuple } from '../core/versions.js';

describe('intake caveat taxonomy and ask-slot contract', () => {
  it('maps emitted caveats to taxonomy metadata', () => {
    const env = evaluateIntakeReadinessEnvelope({
      responses: {
        a1: 'Example Clinic',
        a2: 'Healthcare',
        a3: 'Palma',
        a5: { value: 'No website yet', source: 'unknown' },
      },
      slaProductMode: 'express',
      collectionMode: 'self_serve',
      surface: 'client_form',
      enforcementPoint: 'brief_recompute',
      criticalSignalsMode: 'full',
    });
    if (!env.caveats || env.caveats.length === 0) {
      throw new Error('Expected caveats to be emitted');
    }
    for (const caveat of env.caveats) {
      expect(INTAKE_READINESS_CAVEAT_TAXONOMY[caveat]).toBeDefined();
    }
    expect(env.caveatDetails?.length).toBeGreaterThan(0);
  });

  it('emits ask-slot contract trace details for pilot sequencing ids', () => {
    const result = applySequencingPilotToPlan({
      sequencingVersion: currentIntakeVersionTuple().sequencingVersion,
      nextRecommended: ['a2', 'a5', 'a1', 'f1', 'f2', 'd2', 'd_closing_flow'],
      visible: ['a2', 'a5', 'a1', 'f1', 'f2', 'd2', 'd_closing_flow'],
      responses: {
        a2: 'Healthcare',
        a5: 'Yes, multi-page site',
      },
    });

    const askSlotEntries = result.sequencingTrace.filter(
      entry => entry.code === 'sequencing_ask_slot_contract_applied',
    );
    expect(askSlotEntries.length).toBeGreaterThan(0);
    expect(askSlotEntries.some(entry => entry.questionId === 'a2')).toBe(true);
    const a2Entry = askSlotEntries.find(entry => entry.questionId === 'a2');
    expect(Array.isArray(a2Entry?.detail?.unlocksSignals)).toBe(true);
    expect(typeof a2Entry?.detail?.guardDomain).toBe('string');
  });
});
