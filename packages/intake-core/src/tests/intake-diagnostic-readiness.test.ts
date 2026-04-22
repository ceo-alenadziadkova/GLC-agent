import { describe, expect, it } from 'vitest';

import { buildIntakePlan } from '../core/build-intake-plan.js';
import { currentIntakeVersionTuple } from '../core/versions.js';
import { evaluateIntakeReadinessEnvelope } from '../core/intake-readiness-envelope.js';
import { evaluateCriticalSignalsPilot } from '../core/evaluate-critical-signals.js';
import { missingRequiredForMode } from '../core/intake-readiness-sla-helpers.js';

/** DRY test helper — build plan from raw responses (same entry as production `buildIntakePlan`). */
function planFromResponses(responses: Record<string, unknown>) {
  return buildIntakePlan({
    responses,
    productMode: 'full',
    collectionMode: 'self_serve',
    surface: 'client_form',
    intakeVersionTuple: currentIntakeVersionTuple(),
  });
}

describe('diagnostic intake readiness (ADR pilot)', () => {
  it('pilot critical signals emit semantic trace when industry is Healthcare', () => {
    const responses = { a2: 'Healthcare' };
    const plan = planFromResponses(responses);
    const { trace } = evaluateCriticalSignalsPilot({ responses, plan });
    expect(trace.some(t => t.semanticCause.includes('unanswered'))).toBe(true);
    expect(trace.some(t => t.code === 'critical_signal_unanswered')).toBe(true);
    expect(trace.some(t => t.code === 'critical_signal_metadata_applied')).toBe(true);
  });

  it('sla_only readiness skips pilot registry with explicit trace', () => {
    const env = evaluateIntakeReadinessEnvelope({
      responses: { a2: 'Healthcare' },
      slaProductMode: 'full',
      collectionMode: 'interview',
      surface: 'consultant_interview',
      intakeVersionTuple: currentIntakeVersionTuple(),
      criticalSignalsMode: 'sla_only',
    });
    expect(env.trace.some(t => t.code === 'pilot_critical_signals_skipped')).toBe(true);
  });

  it('remediation idempotence: repeated readiness evaluation yields same statuses for fixed responses', () => {
    const responses = { a2: 'Professional Services', a5: 'no_website' };
    const input = {
      responses,
      slaProductMode: 'full' as const,
      collectionMode: 'self_serve' as const,
      surface: 'client_form' as const,
      intakeVersionTuple: currentIntakeVersionTuple(),
    };
    const a = evaluateIntakeReadinessEnvelope(input);
    const b = evaluateIntakeReadinessEnvelope(input);
    expect(a.auditReadinessStatus).toBe(b.auditReadinessStatus);
    expect(a.flowReadinessStatus).toBe(b.flowReadinessStatus);
  });

  it('brief_recompute is advisory for self-serve audit readiness (surface policy)', () => {
    const env = evaluateIntakeReadinessEnvelope({
      responses: { a2: 'Healthcare' },
      slaProductMode: 'full',
      collectionMode: 'self_serve',
      surface: 'client_form',
      intakeVersionTuple: currentIntakeVersionTuple(),
      enforcementPoint: 'brief_recompute',
    });
    expect(env.auditReadinessStatus).toBe('ready_with_caveats');
    expect(env.caveats).toContain('surface_limited_context');
    expect(env.trace.some(t => t.code === 'audit_readiness_not_enforced_at_point')).toBe(true);
  });

  it('brief_recompute adds unknown_source_signal_evidence caveat when blocked signal is unknown-sourced', () => {
    const env = evaluateIntakeReadinessEnvelope({
      responses: {
        a2: 'Healthcare',
        a5: 'multi_page_website',
        f1: { value: ['Operational delays'], source: 'unknown' },
      },
      slaProductMode: 'full',
      collectionMode: 'self_serve',
      surface: 'client_form',
      intakeVersionTuple: currentIntakeVersionTuple(),
      enforcementPoint: 'brief_recompute',
    });
    expect(env.auditReadinessStatus).toBe('ready_with_caveats');
    expect(env.caveats).toContain('surface_limited_context');
    expect(env.caveats).toContain('unknown_source_signal_evidence');
  });

  it('sequencing pilot reorders nextRecommended for Healthcare when enabled', () => {
    const plan = planFromResponses({
      a2: 'Healthcare',
      a5: 'multi_page_website',
      a1: 'x',
    });
    expect(plan.versions.sequencingVersion).toBeDefined();
    const ia = plan.nextRecommended.indexOf('a2');
    const id = plan.nextRecommended.indexOf('d2');
    if (ia >= 0 && id >= 0) {
      expect(ia).toBeLessThan(id);
    }
    expect(plan.debugTrace?.some(e => e.code === 'sequencing_pilot_applied')).toBe(true);
  });

  it('Healthcare pilot exposes critical signal confidence keys on the plan', () => {
    const plan = planFromResponses({
      a2: 'Healthcare',
    });
    expect(plan.criticalSignals?.confidenceByKey.industry).toBe('low');
    expect(plan.criticalSignals?.confidenceByKey.website_presence).toBe('unknown');
  });

  it('unknown-sourced pilot critical answer caps confidence at low and fails the gate', () => {
    const responses = {
      a2: 'Healthcare',
      a5: 'multi_page_website',
      f1: { value: ['Operational delays'], source: 'unknown' },
    };
    const plan = planFromResponses(responses);
    const crit = evaluateCriticalSignalsPilot({ responses, plan });
    expect(crit.satisfied).toBe(false);
    expect(crit.confidenceByKey.primary_problem).toBe('low');
  });

  it('source not listed in sourcesByPriority is bounded to low confidence with trace', () => {
    const responses = {
      a2: 'Healthcare',
      a5: { value: 'multi_page_website', source: 'legacy_import' },
      f1: ['Operational delays'],
      d2: 'Managing team tasks and handoffs',
      f2: ['Website performance and technology (speed, stability, technical health)'],
      d_closing_flow: ['I send a quote or price manually'],
    };
    const plan = planFromResponses(responses);
    const crit = evaluateCriticalSignalsPilot({ responses, plan });
    expect(crit.confidenceByKey.website_presence).toBe('low');
    expect(crit.trace.some(t => t.code === 'critical_signal_source_priority_miss')).toBe(true);
  });

  it('sequencing pilot emits sequencing_dep_prerequisite_pending when dependency bank (a1) is unanswered', () => {
    const responses = {
      a2: 'Healthcare',
      a5: 'multi_page_website',
      f1: ['Too much manual work and operational overload'],
    };
    const plan = planFromResponses(responses);
    const pending = plan.debugTrace?.filter(e => e.code === 'sequencing_dep_prerequisite_pending') ?? [];
    expect(pending.length).toBeGreaterThan(0);
    expect(pending.some(p => /company name|Primary problem|operations bottleneck/i.test(p.message))).toBe(true);
  });

  it('sequencing pilot emits sequencing_dep_satisfied when dependency prerequisites are answered', () => {
    const responses = {
      a2: 'Healthcare',
      a5: 'multi_page_website',
      a1: 'https://example.com',
      f1: ['Too much manual work and operational overload'],
      f2: ['Website performance and technology (speed, stability, technical health)'],
      d2: 'Managing team tasks and handoffs',
      d_closing_flow: ['I send a quote or price manually'],
    };
    const plan = planFromResponses(responses);
    const satisfied = plan.debugTrace?.filter(e => e.code === 'sequencing_dep_satisfied') ?? [];
    const pending = plan.debugTrace?.filter(e => e.code === 'sequencing_dep_prerequisite_pending') ?? [];
    expect(satisfied.length).toBeGreaterThan(0);
    expect(pending.length).toBe(0);
  });

  /**
   * Baseline readiness is package-agnostic: `slaProductMode: 'express'` must use express SLA
   * missing set for audit blocking, not full-only gaps (ADR Phase-1; execution-plan-aware floors are Phase B/C).
   */
  it('express slaProductMode is ready_with_caveats when express required + pilot signals are met despite full SLA gaps', () => {
    const tuple = currentIntakeVersionTuple();
    const surface = 'client_form' as const;
    const collectionMode = 'self_serve' as const;
    const responses: Record<string, unknown> = {
      a2: 'Healthcare',
      a5: 'multi_page_website',
      a1: 'https://hotel.example',
      a6: 'Yes',
      a10: ['One-time services (projects, consulting)'],
      b1: 'Boutique hotel groups',
      f1: ['Too much manual work and operational overload'],
      f2: ['Website performance and technology (speed, stability, technical health)'],
      d2: 'Managing team tasks and handoffs',
      d_closing_flow: ['I send a quote or price manually'],
    };
    const missingFull = missingRequiredForMode(responses, 'full', collectionMode, surface, tuple);
    const missingExpress = missingRequiredForMode(responses, 'express', collectionMode, surface, tuple);
    expect(missingExpress.length).toBe(0);
    expect(missingFull.length).toBeGreaterThan(0);

    const env = evaluateIntakeReadinessEnvelope({
      responses,
      slaProductMode: 'express',
      collectionMode,
      surface,
      intakeVersionTuple: tuple,
    });
    expect(env.auditReadinessStatus).toBe('ready_with_caveats');
    expect(env.caveats).toContain('full_scope_required_gaps');
    expect(env.flowReadinessStatus).toBe('flow_ready');
  });
});
