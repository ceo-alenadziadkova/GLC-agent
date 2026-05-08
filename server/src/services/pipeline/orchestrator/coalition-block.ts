import type { DomainKey } from '@glc/intake-core';

import { ContextDirectorAgent } from '../../../agents/context-director.js';
import { CrossDomainConflictResolverAgent } from '../../../agents/cross-domain-conflict-resolver.js';
import { DomainAlignmentAgent } from '../../../agents/domain-alignment.js';
import { DomainHypothesisAgent } from '../../../agents/domain-hypothesis.js';
import { PIPELINE_EVENT_TYPES } from '../../../config/pipeline-event-types.js';
import { DOMAIN_PHASES } from '../../../config/audit-phase-constants.js';
import {
  getCoalitionProtocolRolloutMode,
  isCoalitionProtocolEnabled,
} from '../../../config/feature-flags.js';
import {
  COALITION_ALIGNMENT_SCHEMA_VERSION,
} from '../../../config/coalition-protocol-policy.js';
import type { DomainAlignmentResponse } from '../../../schemas/director-collaboration/alignment.js';
import { persistDomainAlignmentResponse } from '../../coalition/coalition-artifact-persistence.js';
import { logger } from '../../logger.js';
import type { EmitPipelineEventFn } from './run-single-phase.js';

const COALITION_DOMAIN_KEYS = Object.keys(DOMAIN_PHASES) as DomainKey[];

export type RunCoalitionShadowBlockParams = {
  auditId: string;
  emitEvent: EmitPipelineEventFn;
};

function shouldRunCoalitionBlock(): boolean {
  if (!isCoalitionProtocolEnabled()) return false;
  return ['shadow', 'internal', 'pilot', 'ga'].includes(getCoalitionProtocolRolloutMode());
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

export async function runCoalitionShadowBlock(params: RunCoalitionShadowBlockParams): Promise<void> {
  const { auditId, emitEvent } = params;
  if (!shouldRunCoalitionBlock()) return;

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
  }

  await emitEvent(7, PIPELINE_EVENT_TYPES.log, 'Coalition protocol shadow block completed', {
    resolved_conflicts_count: resolution.resolved_conflicts.length,
    unresolved_count: resolution.unresolved.length,
  });
}

