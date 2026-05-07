import { useCallback, useState } from 'react';

import { DOMAIN_LABELS, type DomainKey } from '../data/auditTypes';
import type { OrchestrationChangeScenario, OrchestrationSeasonPreset } from '../config/orchestration-roadmap-manifest';
import { ORCHESTRATION_MANIFEST_SCHEMA_VERSION, parseOptionalOrchestrationPlanHorizon } from '../config/orchestration-roadmap-manifest';
import type { OrchestrationCommercialOfferResponseDto, OrchestrationPlanGovernanceDto } from '../data/api/audits-orchestration';
import { api } from '../data/apiService';
import { extractPlanGovernanceFromPackApiError } from '../lib/orchestration-pack-api-error';
import { ORCHESTRATION_UI_COPY } from '../config/orchestration-roadmap-ui-copy.en';
import { toast } from 'sonner';

type UseOrchestrationCommercialOfferOptions = {
  auditId: string;
  selectedDomains: DomainKey[];
  scenario: OrchestrationChangeScenario;
  season: OrchestrationSeasonPreset;
  planHorizonStart: string;
  planHorizonEnd: string;
  onReload: () => void;
  onAcceptedPackResult: (result: {
    roadmap_version: number;
    last_revision_diff: OrchestrationCommercialOfferResponseDto['accepted_pack_result'] extends infer R
      ? R extends { last_revision_diff: infer D }
        ? D
        : never
      : never;
    plan_governance: OrchestrationPlanGovernanceDto;
  }) => void;
  onGovernanceFromError: (planGovernance: OrchestrationPlanGovernanceDto) => void;
};

type AcceptDomain = keyof typeof DOMAIN_LABELS;

export function useOrchestrationCommercialOffer({
  auditId,
  selectedDomains,
  scenario,
  season,
  planHorizonStart,
  planHorizonEnd,
  onReload,
  onAcceptedPackResult,
  onGovernanceFromError,
}: UseOrchestrationCommercialOfferOptions) {
  const [commercialOffer, setCommercialOffer] = useState<OrchestrationCommercialOfferResponseDto | null>(null);
  const [commercialWorking, setCommercialWorking] = useState(false);
  const [pendingAcceptDomain, setPendingAcceptDomain] = useState<AcceptDomain | null>(null);

  const performCommercialOfferFetch = useCallback(
    async (accept_domain?: AcceptDomain) => {
      setCommercialWorking(true);
      try {
        const planHorizon = parseOptionalOrchestrationPlanHorizon(planHorizonStart, planHorizonEnd);
        const res = await api.postOrchestrationCommercialOffer(auditId, {
          schema_version: ORCHESTRATION_MANIFEST_SCHEMA_VERSION,
          selected_domains: selectedDomains,
          change_scenario: scenario,
          season_preset: season,
          ...(planHorizon ? { plan_horizon: planHorizon } : {}),
          ...(accept_domain ? { accept_domain } : {}),
        });
        setCommercialOffer(res);
        if (res.accepted_pack_result) {
          onAcceptedPackResult({
            roadmap_version: res.accepted_pack_result.roadmap_version,
            last_revision_diff: res.accepted_pack_result.last_revision_diff,
            plan_governance: res.accepted_pack_result.plan_governance,
          });
          toast.success(ORCHESTRATION_UI_COPY.packBuilt);
          onReload();
        }
      } catch (e) {
        const pg = extractPlanGovernanceFromPackApiError(e);
        if (pg) onGovernanceFromError(pg);
        setCommercialOffer(null);
      } finally {
        setCommercialWorking(false);
      }
    },
    [
      auditId,
      onAcceptedPackResult,
      onGovernanceFromError,
      onReload,
      planHorizonEnd,
      planHorizonStart,
      scenario,
      season,
      selectedDomains,
    ],
  );

  const handleProbeCommercialOffer = useCallback(async () => {
    await performCommercialOfferFetch(undefined);
  }, [performCommercialOfferFetch]);

  const handleRequestAcceptDomain = useCallback((accept_domain: AcceptDomain) => {
    setPendingAcceptDomain(accept_domain);
  }, []);

  const handleCancelInlineAccept = useCallback(() => {
    setPendingAcceptDomain(null);
  }, []);

  const handleConfirmInlineAccept = useCallback(
    (accept_domain: AcceptDomain) => {
      setPendingAcceptDomain(null);
      void performCommercialOfferFetch(accept_domain);
    },
    [performCommercialOfferFetch],
  );

  return {
    commercialOffer,
    commercialWorking,
    pendingAcceptDomain,
    handleProbeCommercialOffer,
    handleRequestAcceptDomain,
    handleCancelInlineAccept,
    handleConfirmInlineAccept,
  };
}
