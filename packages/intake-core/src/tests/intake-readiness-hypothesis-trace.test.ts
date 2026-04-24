import { describe, expect, it } from 'vitest';

import { INTAKE_READINESS_PROGRESSIVE_CERTAINTY_TRACE_CODES } from '../audit-contract.js';
import { evaluateIntakeReadinessEnvelope } from '../core/intake-readiness-envelope.js';
import { currentIntakeVersionTuple } from '../core/versions.js';

describe('evaluateIntakeReadinessEnvelope progressive certainty trace', () => {
  it('exports a stable progressive-certainty vocabulary', () => {
    expect(INTAKE_READINESS_PROGRESSIVE_CERTAINTY_TRACE_CODES).toContain('hypothesis_confirmed');
    expect(INTAKE_READINESS_PROGRESSIVE_CERTAINTY_TRACE_CODES).toContain('hypothesis_disconfirmed');
  });

  it('emits hypothesis_formed when a pilot bank id is answered but signal confidence is not high', () => {
    const env = evaluateIntakeReadinessEnvelope({
      responses: { f1: ['Growth'] },
      slaProductMode: 'full',
      collectionMode: 'self_serve',
      surface: 'client_form',
      intakeVersionTuple: currentIntakeVersionTuple(),
    });
    expect(env.trace.some(t => t.code === 'hypothesis_formed')).toBe(true);
  });

  it('emits hypothesis_confirmed when a second source agrees and confidence is still below medium', () => {
    const env = evaluateIntakeReadinessEnvelope({
      responses: { f1: ['Growth'] },
      hypothesisCrossCheckByQuestionId: {
        f1: { value: ['Growth'], source: 'recon_confirmed' },
      },
      slaProductMode: 'full',
      collectionMode: 'self_serve',
      surface: 'client_form',
      intakeVersionTuple: currentIntakeVersionTuple(),
    });
    expect(env.trace.some(t => t.code === 'hypothesis_confirmed')).toBe(true);
    expect(env.trace.some(t => t.code === 'hypothesis_formed')).toBe(false);
  });

  it('emits hypothesis_disconfirmed when cross-source disagrees with the respondent answer', () => {
    const env = evaluateIntakeReadinessEnvelope({
      responses: { f1: ['Growth'] },
      hypothesisCrossCheckByQuestionId: {
        f1: { value: ['Compliance'], source: 'imported' },
      },
      slaProductMode: 'full',
      collectionMode: 'self_serve',
      surface: 'client_form',
      intakeVersionTuple: currentIntakeVersionTuple(),
    });
    expect(env.trace.some(t => t.code === 'hypothesis_disconfirmed')).toBe(true);
  });

  it('emits uncertainty_closed when mapped pilot signal reaches medium+ confidence (Healthcare pilot)', () => {
    const env = evaluateIntakeReadinessEnvelope({
      responses: {
        a2: 'Healthcare',
        a5: 'multi_page_website',
        f1: ['Growth'],
        f2: ['SEO'],
        d2: 'Sales',
        d_closing_flow: ['Quote'],
      },
      slaProductMode: 'full',
      collectionMode: 'self_serve',
      surface: 'client_form',
      intakeVersionTuple: currentIntakeVersionTuple(),
    });
    expect(env.trace.some(t => t.code === 'uncertainty_closed')).toBe(true);
  });
});
