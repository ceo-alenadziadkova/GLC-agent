import type { IntakeReadinessCaveatClass } from '../audit-contract.js';

export interface IntakeReadinessCaveatTaxonomyEntry {
  owner: 'product' | 'engineering' | 'ops';
  severity: 'info' | 'warning' | 'blocking';
  rolloutPhase: 'phase_1' | 'phase_bc';
  semanticIntent: string;
}

export const INTAKE_READINESS_CAVEAT_TAXONOMY: Record<
  IntakeReadinessCaveatClass,
  IntakeReadinessCaveatTaxonomyEntry
> = {
  full_scope_required_gaps: {
    owner: 'product',
    severity: 'warning',
    rolloutPhase: 'phase_1',
    semanticIntent:
      'Express baseline gate is satisfied while full-scope required context is still incomplete',
  },
  unknown_source_signal_evidence: {
    owner: 'product',
    severity: 'warning',
    rolloutPhase: 'phase_bc',
    semanticIntent:
      'Readiness relies on evidence that is unknown-sourced and should be treated as advisory',
  },
  presale_missing_data_allowed: {
    owner: 'product',
    severity: 'warning',
    rolloutPhase: 'phase_bc',
    semanticIntent:
      'Admin presale mode allows launching with unknown-sourced critical evidence while marking readiness caveats',
  },
  surface_limited_context: {
    owner: 'product',
    severity: 'warning',
    rolloutPhase: 'phase_1',
    semanticIntent:
      'Current surface boundary is advisory and does not enforce full execution-readiness semantics',
  },
  execution_scope_missing_signals: {
    owner: 'engineering',
    severity: 'blocking',
    rolloutPhase: 'phase_bc',
    semanticIntent:
      'Selected execution-plan scope has unresolved critical coverage gaps that block execution',
  },
  critical_signal_low_confidence: {
    owner: 'engineering',
    severity: 'warning',
    rolloutPhase: 'phase_bc',
    semanticIntent:
      'Pilot critical-signal evidence is present but below required confidence for strict readiness',
  },
  bridge_dependency_pending: {
    owner: 'product',
    severity: 'info',
    rolloutPhase: 'phase_bc',
    semanticIntent:
      'Sequencing bridge dependency remains pending and should be reviewed in bridge governance windows',
  },
};
