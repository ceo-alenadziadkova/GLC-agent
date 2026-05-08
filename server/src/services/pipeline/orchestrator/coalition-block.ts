import type { DomainKey } from '@glc/intake-core';

import { AutomationProcessesAlignmentAgent } from '../../../agents/automation_processes-alignment.js';
import { AutomationProcessesHypothesisAgent } from '../../../agents/automation_processes-hypothesis.js';
import { ContextDirectorAgent } from '../../../agents/context-director.js';
import { CrossDomainConflictResolverAgent } from '../../../agents/cross-domain-conflict-resolver.js';
import { DomainAlignmentAgent } from '../../../agents/domain-alignment.js';
import { DomainHypothesisAgent } from '../../../agents/domain-hypothesis.js';
import { MarketingUtpAlignmentAgent } from '../../../agents/marketing_utp-alignment.js';
import { MarketingUtpHypothesisAgent } from '../../../agents/marketing_utp-hypothesis.js';
import { SecurityComplianceAlignmentAgent } from '../../../agents/security_compliance-alignment.js';
import { SecurityComplianceHypothesisAgent } from '../../../agents/security_compliance-hypothesis.js';
import { SeoDigitalAlignmentAgent } from '../../../agents/seo_digital-alignment.js';
import { SeoDigitalHypothesisAgent } from '../../../agents/seo_digital-hypothesis.js';
import { TechInfrastructureAlignmentAgent } from '../../../agents/tech_infrastructure-alignment.js';
import { TechInfrastructureHypothesisAgent } from '../../../agents/tech_infrastructure-hypothesis.js';
import { UxConversionAlignmentAgent } from '../../../agents/ux_conversion-alignment.js';
import { UxConversionHypothesisAgent } from '../../../agents/ux_conversion-hypothesis.js';
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
type CoalitionDomainAgentConstructor<TAgent extends DomainHypothesisAgent | DomainAlignmentAgent> = new (
  auditId: string
) => TAgent;

const COALITION_HYPOTHESIS_AGENT_BY_DOMAIN: Readonly<
  Record<DomainKey, CoalitionDomainAgentConstructor<DomainHypothesisAgent>>
> = {
  tech_infrastructure: TechInfrastructureHypothesisAgent,
  security_compliance: SecurityComplianceHypothesisAgent,
  seo_digital: SeoDigitalHypothesisAgent,
  ux_conversion: UxConversionHypothesisAgent,
  marketing_utp: MarketingUtpHypothesisAgent,
  automation_processes: AutomationProcessesHypothesisAgent,
};

const COALITION_ALIGNMENT_AGENT_BY_DOMAIN: Readonly<
  Record<DomainKey, CoalitionDomainAgentConstructor<DomainAlignmentAgent>>
> = {
  tech_infrastructure: TechInfrastructureAlignmentAgent,
  security_compliance: SecurityComplianceAlignmentAgent,
  seo_digital: SeoDigitalAlignmentAgent,
  ux_conversion: UxConversionAlignmentAgent,
  marketing_utp: MarketingUtpAlignmentAgent,
  automation_processes: AutomationProcessesAlignmentAgent,
};

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
  const Agent = COALITION_ALIGNMENT_AGENT_BY_DOMAIN[domainKey];
  const agent = new Agent(auditId);
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

  await emitEvent(0, PIPELINE_EVENT_TYPES.log, 'Coalition phase 0.5 Context Director started');
  await new ContextDirectorAgent(auditId).execute();
  await emitEvent(0, PIPELINE_EVENT_TYPES.log, 'Coalition phase 0.5 Context Director completed');

  await emitEvent(1, PIPELINE_EVENT_TYPES.log, 'Coalition phase 1 Hypothesis Round started');
  await Promise.all(
    COALITION_DOMAIN_KEYS.map(async (domainKey) => {
      const Agent = COALITION_HYPOTHESIS_AGENT_BY_DOMAIN[domainKey];
      await new Agent(auditId).execute();
    }),
  );
  await emitEvent(1, PIPELINE_EVENT_TYPES.log, 'Coalition phase 1 Hypothesis Round completed');

  await emitEvent(2, PIPELINE_EVENT_TYPES.log, 'Coalition phase 2 Alignment Round started');
  await Promise.all(
    COALITION_DOMAIN_KEYS.map(async (domainKey) => {
      await runAlignmentWithFallback(auditId, domainKey);
    }),
  );
  await emitEvent(2, PIPELINE_EVENT_TYPES.log, 'Coalition phase 2 Alignment Round completed');

  if (isCoalitionPhase3IterativeEnabled()) {
    await emitEvent(7, PIPELINE_EVENT_TYPES.log, 'Coalition iterative resolver flag enabled; V1 resolver remains single-pass', {
      rollout_mode: getCoalitionProtocolRolloutMode(),
    });
  }

  await emitEvent(7, PIPELINE_EVENT_TYPES.log, 'Coalition phase 3 Conflict Resolver started');
  const resolution = await new CrossDomainConflictResolverAgent(auditId).execute();
  await emitEvent(7, PIPELINE_EVENT_TYPES.log, 'Coalition phase 3 Conflict Resolver completed');
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
    await emitEvent(
      7,
      PIPELINE_EVENT_TYPES.coalitionUnresolvedEscalation,
      'Coalition unresolved escalation',
      {
        unresolved_count: resolution.unresolved.length,
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

