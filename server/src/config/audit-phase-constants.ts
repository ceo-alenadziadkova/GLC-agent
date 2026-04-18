import type { DomainKey } from '@glc/intake-core';

/**
 * Pipeline phase index → domain or special phase key (recon / strategy).
 * Must stay aligned with orchestrator phase numbering.
 */
export const PHASE_DOMAIN_MAP: Record<number, DomainKey | 'recon' | 'strategy'> = {
  0: 'recon',
  1: 'tech_infrastructure',
  2: 'security_compliance',
  3: 'seo_digital',
  4: 'ux_conversion',
  5: 'marketing_utp',
  6: 'automation_processes',
  7: 'strategy',
};

/** Full-audit review gates (recon, post-UX, post-strategy). */
export const REVIEW_AFTER_PHASES = [0, 4, 7] as const;

// Express runs recon + tech–UX only (phases 0–4); phases 5–7 skipped.
export const EXPRESS_DOMAIN_KEYS = [
  'tech_infrastructure',
  'security_compliance',
  'seo_digital',
  'ux_conversion',
] as const satisfies readonly DomainKey[];

export const EXPRESS_MAX_PHASE = 4;
export const EXPRESS_REVIEW_AFTER_PHASES = [0, 4] as const;

/** Free snapshot caps at the UX phase slot (see PipelineOrchestrator.runFreeSnapshot). */
export const FREE_SNAPSHOT_MAX_PHASE = 4;

/**
 * Inclusive end phase of the recon–UX block. When an execution plan includes any phase in
 * [1, PIPELINE_UX_BLOCK_END_PHASE], gate4 (after_phase 4) applies.
 */
export const PIPELINE_UX_BLOCK_END_PHASE = 4;

export const DOMAIN_PHASES: Record<DomainKey, number> = {
  tech_infrastructure: 1,
  security_compliance: 2,
  seo_digital: 3,
  ux_conversion: 4,
  marketing_utp: 5,
  automation_processes: 6,
};
