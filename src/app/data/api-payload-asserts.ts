export function assertIntakePayloadShape(payload: unknown): asserts payload is {
  intakeProgress: { progressPct: number; readinessBadge: string; nextBestAction: string };
  gates: { canStartSnapshot: boolean; canStartExpress: boolean; canStartFull: boolean; canStartPipeline: boolean };
} {
  const p = payload as Record<string, unknown>;
  const gates = p?.gates as Record<string, unknown> | undefined;
  const intakeProgress = p?.intakeProgress as Record<string, unknown> | undefined;
  if (!gates || !intakeProgress) throw new Error('Invalid API payload: missing intakeProgress/gates');
  if (
    typeof gates.canStartSnapshot !== 'boolean' ||
    typeof gates.canStartExpress !== 'boolean' ||
    typeof gates.canStartFull !== 'boolean' ||
    typeof gates.canStartPipeline !== 'boolean'
  ) {
    throw new Error('Invalid API payload: invalid gates shape');
  }
  if (typeof intakeProgress.progressPct !== 'number' || typeof intakeProgress.readinessBadge !== 'string' || typeof intakeProgress.nextBestAction !== 'string') {
    throw new Error('Invalid API payload: invalid intakeProgress shape');
  }
}

export function assertPipelineStartShape(payload: unknown): asserts payload is {
  status: string;
  phase: number;
  intakeProgress: { progressPct: number; readinessBadge: string; nextBestAction: string };
} {
  const p = payload as Record<string, unknown>;
  if (typeof p?.status !== 'string' || typeof p?.phase !== 'number') {
    throw new Error('Invalid API payload: invalid pipeline start shape');
  }
  const intakeProgress = p?.intakeProgress as Record<string, unknown> | undefined;
  if (!intakeProgress) throw new Error('Invalid API payload: missing intakeProgress in pipeline start');
  if (typeof intakeProgress.progressPct !== 'number' || typeof intakeProgress.readinessBadge !== 'string' || typeof intakeProgress.nextBestAction !== 'string') {
    throw new Error('Invalid API payload: invalid intakeProgress in pipeline start');
  }
}

export function assertPipelineStatusShape(payload: unknown): asserts payload is {
  status: string;
  current_phase: number;
  tokens_used: number;
  token_budget: number;
  product_mode: string;
  events: Array<{
    id: number;
    audit_id: string;
    phase: number;
    event_type: string;
    message: string | null;
    data: Record<string, unknown>;
    created_at: string;
  }>;
  reviews: Array<{
    after_phase: number;
    status: string;
    consultant_notes: string | null;
    interview_notes: string | null;
  }>;
} {
  const p = payload as Record<string, unknown>;
  if (typeof p?.status !== 'string') {
    throw new Error('Invalid API payload: pipeline status missing status');
  }
  if (typeof p?.current_phase !== 'number') {
    throw new Error('Invalid API payload: pipeline status missing current_phase');
  }
  if (typeof p?.tokens_used !== 'number' || typeof p?.token_budget !== 'number') {
    throw new Error('Invalid API payload: pipeline status missing token fields');
  }
  if (typeof p?.product_mode !== 'string') {
    throw new Error('Invalid API payload: pipeline status missing product_mode');
  }
  if (!Array.isArray(p?.events)) {
    throw new Error('Invalid API payload: pipeline status events must be an array');
  }
  if (!Array.isArray(p?.reviews)) {
    throw new Error('Invalid API payload: pipeline status reviews must be an array');
  }
  for (let i = 0; i < p.events.length; i++) {
    const e = p.events[i] as Record<string, unknown>;
    if (typeof e?.id !== 'number' || typeof e?.audit_id !== 'string' || typeof e?.phase !== 'number') {
      throw new Error(`Invalid API payload: pipeline event[${i}] missing id/audit_id/phase`);
    }
    if (typeof e?.event_type !== 'string' || (e?.message !== null && typeof e?.message !== 'string')) {
      throw new Error(`Invalid API payload: pipeline event[${i}] invalid event_type/message`);
    }
    if (e?.data === null || typeof e?.data !== 'object' || Array.isArray(e.data)) {
      throw new Error(`Invalid API payload: pipeline event[${i}] data must be an object`);
    }
    if (typeof e?.created_at !== 'string') {
      throw new Error(`Invalid API payload: pipeline event[${i}] missing created_at`);
    }
  }
  for (let i = 0; i < p.reviews.length; i++) {
    const r = p.reviews[i] as Record<string, unknown>;
    if (typeof r?.after_phase !== 'number' || typeof r?.status !== 'string') {
      throw new Error(`Invalid API payload: pipeline review[${i}] missing after_phase/status`);
    }
    if (r?.consultant_notes !== null && typeof r?.consultant_notes !== 'string') {
      throw new Error(`Invalid API payload: pipeline review[${i}] invalid consultant_notes`);
    }
    if (r?.interview_notes !== null && typeof r?.interview_notes !== 'string') {
      throw new Error(`Invalid API payload: pipeline review[${i}] invalid interview_notes`);
    }
  }
}

export function assertPipelineMutationShape(payload: unknown, label: string): asserts payload is { status: string; phase: number } {
  const p = payload as Record<string, unknown>;
  if (typeof p?.status !== 'string' || typeof p?.phase !== 'number') {
    throw new Error(`Invalid API payload: ${label} missing status/phase`);
  }
}
