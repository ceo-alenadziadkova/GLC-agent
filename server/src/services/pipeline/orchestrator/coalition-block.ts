import type { DomainKey } from '@glc/intake-core';

import { ContextDirectorAgent } from '../../../agents/context-director.js';
import { CrossDomainConflictResolverAgent } from '../../../agents/cross-domain-conflict-resolver.js';
import { DomainAlignmentAgent } from '../../../agents/domain-alignment.js';
import { DomainHypothesisAgent } from '../../../agents/domain-hypothesis.js';
import { PIPELINE_EVENT_TYPES } from '../../../config/pipeline-event-types.js';
import { DOMAIN_PHASES } from '../../../config/audit-phase-constants.js';
import {
  getCoalitionProtocolRolloutMode,
  isCoalitionAutoLoopEnabled,
  isCoalitionPhase3IterativeEnabled,
} from '../../../config/feature-flags.js';
import { isCoalitionRolloutUnlockedForAudit } from '../../../config/coalition-rollout-gates.js';
import {
  COALITION_ALIGNMENT_SCHEMA_VERSION,
  COALITION_AUTO_LOOP_MAX_RUNS,
} from '../../../config/coalition-protocol-policy.js';
import type { DomainAlignmentResponse } from '../../../schemas/director-collaboration/alignment.js';
import { persistCoalitionCausalSnapshot } from '../../coalition/coalition-causal-snapshot.js';
import { persistDomainAlignmentResponse } from '../../coalition/coalition-artifact-persistence.js';
import { logger } from '../../logger.js';
import { supabase } from '../../supabase.js';
import type { EmitPipelineEventFn } from './run-single-phase.js';

const COALITION_DOMAIN_KEYS = Object.keys(DOMAIN_PHASES) as DomainKey[];

export type RunCoalitionShadowBlockParams = {
  auditId: string;
  emitEvent: EmitPipelineEventFn;
};

async function shouldRunCoalitionBlock(auditId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('audits')
    .select('user_id, client_id')
    .eq('id', auditId)
    .single();
  if (error) {
    logger.warn('coalition.rollout_audit_lookup_failed', {
      component: 'coalition',
      audit_id: auditId,
      error: error.message,
    });
    return false;
  }
  return isCoalitionRolloutUnlockedForAudit({
    userId: typeof data?.user_id === 'string' ? data.user_id : null,
    clientId: typeof data?.client_id === 'string' ? data.client_id : null,
  });
}

function buildDegradedAlignment(auditId: string, domainKey: DomainKey): DomainAlignmentResponse {
  return {
    schema_version: COALITION_ALIGNMENT_SCHEMA_VERSION,
    audit_id: auditId,
    domain_key: domainKey,
    cross_domain_reactions: [],
    self_corrections: [],
    analysis_mode: 'collaboration_degraded',
  };
}

async function runAlignmentWithFallback(auditId: string, domainKey: DomainKey): Promise<void> {
  const agent = new DomainAlignmentAgent(auditId, domainKey);
  try {
    await agent.execute();
  } catch (err) {
    logger.warn('coalition.alignment_degraded', {
      component: 'coalition',
      audit_id: auditId,
      domain_key: domainKey,
      error: err instanceof Error ? err.message : String(err),
    });
    await persistDomainAlignmentResponse(buildDegradedAlignment(auditId, domainKey));
  }
}

async function autoLoopRunCount(auditId: string): Promise<number> {
  const { count, error } = await supabase
    .from('pipeline_events')
    .select('id', { count: 'exact', head: true })
    .eq('audit_id', auditId)
    .eq('event_type', PIPELINE_EVENT_TYPES.coalitionAutoLoopContextDirectorRerun);
  if (error) {
    logger.warn('coalition.auto_loop_count_failed', {
      component: 'coalition',
      audit_id: auditId,
      error: error.message,
    });
    return COALITION_AUTO_LOOP_MAX_RUNS;
  }
  return count ?? 0;
}

export async function runCoalitionShadowBlock(params: RunCoalitionShadowBlockParams): Promise<void> {
  const { auditId, emitEvent } = params;
  if (!(await shouldRunCoalitionBlock(auditId))) return;

  await emitEvent(0, PIPELINE_EVENT_TYPES.log, 'Coalition protocol shadow block started', {
    rollout_mode: getCoalitionProtocolRolloutMode(),
  });

  await new ContextDirectorAgent(auditId).execute();

  await Promise.all(
    COALITION_DOMAIN_KEYS.map(async (domainKey) => {
      await new DomainHypothesisAgent(auditId, domainKey).execute();
    }),
  );

  await Promise.all(
    COALITION_DOMAIN_KEYS.map(async (domainKey) => {
      await runAlignmentWithFallback(auditId, domainKey);
    }),
  );

  if (isCoalitionPhase3IterativeEnabled()) {
    await emitEvent(7, PIPELINE_EVENT_TYPES.log, 'Coalition iterative resolver flag enabled; V1 resolver remains single-pass', {
      rollout_mode: getCoalitionProtocolRolloutMode(),
    });
  }

  const resolution = await new CrossDomainConflictResolverAgent(auditId).execute();
  if (resolution.unresolved.length > 0) {
    await emitEvent(
      7,
      PIPELINE_EVENT_TYPES.coalitionConflictEscalationRequired,
      'Coalition conflict escalation required',
      {
        unresolved_count: resolution.unresolved.length,
        unresolved: resolution.unresolved,
      },
    );
    if (isCoalitionAutoLoopEnabled() && (await autoLoopRunCount(auditId)) < COALITION_AUTO_LOOP_MAX_RUNS) {
      await emitEvent(
        0,
        PIPELINE_EVENT_TYPES.coalitionAutoLoopContextDirectorRerun,
        'Coalition auto-loop rerunning Context Director after unresolved escalation',
        { unresolved_count: resolution.unresolved.length },
      );
      await new ContextDirectorAgent(auditId).execute();
    }
  }

  await persistCoalitionCausalSnapshot(auditId);

  await emitEvent(7, PIPELINE_EVENT_TYPES.log, 'Coalition protocol shadow block completed', {
    resolved_conflicts_count: resolution.resolved_conflicts.length,
    unresolved_count: resolution.unresolved.length,
  });
}

