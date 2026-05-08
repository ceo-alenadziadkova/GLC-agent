import {
  apiAuditsOrchestrationCommercialOffer,
  apiAuditsOrchestrationPack,
  apiAuditsOrchestrationPackRegenerate,
  apiAuditsOrchestrationSelectedInitiative,
  apiAuditsOrchestratorRun,
} from '../../config/api-paths';
import { apiFetch } from '../api-http';
import type { DomainKey } from '../auditTypes';
import type {
  GlcOrchestrationPackRevisionDiffView,
  GlcOrchestrationPackView,
} from '../audit/contracts/report/orchestration-pack.types';
import type {
  OrchestrationCommercialOfferResponseDto,
  OrchestrationPlanGovernanceDto,
  RoadmapManifestRequestBody,
} from './orchestration-types';

export const auditsOrchestrationRunApi = {
  async postOrchestrationPack(
    auditId: string,
    body:
      | { manifest_snapshot_id: string; selected_action_ids?: string[] }
      | {
          govern_action: 'accept_plan' | 'accept_with_warnings' | 'refine_plan';
          expected_orchestration_pack_version: number;
        },
  ) {
    return apiFetch<{
      pack: GlcOrchestrationPackView | null;
      orchestration_pack_version: number;
      roadmap_version?: number;
      last_revision_diff?: GlcOrchestrationPackRevisionDiffView | null;
      last_revision_diff_summary?: string | null;
      plan_governance?: OrchestrationPlanGovernanceDto;
      refine_hint?: boolean;
      govern_action?: 'accept_plan' | 'accept_with_warnings' | 'refine_plan';
    }>(apiAuditsOrchestrationPack(auditId), {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async postOrchestrationPackRegenerate(auditId: string, body: { manifest_snapshot_id: string; selected_action_ids?: string[] }) {
    return apiFetch<{
      pack: GlcOrchestrationPackView;
      orchestration_pack_version: number;
      roadmap_version: number;
      last_revision_diff: GlcOrchestrationPackRevisionDiffView | null;
      last_revision_diff_summary?: string | null;
      plan_governance: OrchestrationPlanGovernanceDto;
    }>(apiAuditsOrchestrationPackRegenerate(auditId), {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async postSelectedInitiative(auditId: string, body: { action_id: string }) {
    return apiFetch<{
      pack: GlcOrchestrationPackView;
      orchestration_pack_version: number;
      roadmap_version: number;
      last_revision_diff: GlcOrchestrationPackRevisionDiffView | null;
      last_revision_diff_summary?: string | null;
      plan_governance: OrchestrationPlanGovernanceDto;
    }>(apiAuditsOrchestrationSelectedInitiative(auditId), {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async postOrchestrationCommercialOffer(
    auditId: string,
    body: RoadmapManifestRequestBody & { accept_domain?: DomainKey },
  ) {
    return apiFetch<OrchestrationCommercialOfferResponseDto>(apiAuditsOrchestrationCommercialOffer(auditId), {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async postOrchestratorRun(auditId: string, body: { manifest_snapshot_id: string; selected_action_ids?: string[] }) {
    return apiFetch<{
      pack: GlcOrchestrationPackView;
      orchestration_pack_version: number;
      roadmap_version: number;
      last_revision_diff: GlcOrchestrationPackRevisionDiffView | null;
      last_revision_diff_summary?: string | null;
      plan_governance: OrchestrationPlanGovernanceDto;
    }>(apiAuditsOrchestratorRun(auditId), {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
};
