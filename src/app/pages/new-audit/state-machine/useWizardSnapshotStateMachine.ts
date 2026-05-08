import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { AuditBriefIntelligenceSnapshotResponse } from '../../../data/api/brief-profile-platform';
import { buildResetIntelligenceSnapshotState } from '../../../lib/new-audit-brief-state';

export function useWizardSnapshotStateMachine(params: {
  setBriefIntelligenceSubStep: Dispatch<SetStateAction<'short_brief' | 'snapshot_confirm'>>;
  setIntelligenceSnapshotResult: Dispatch<SetStateAction<AuditBriefIntelligenceSnapshotResponse | null>>;
  setIntelligenceSnapshotError: Dispatch<SetStateAction<string | null>>;
  setIntelligenceSnapshotPhase: Dispatch<SetStateAction<'standard' | 'early'>>;
  setIntelligenceLlm1Done: Dispatch<SetStateAction<boolean>>;
}) {
  const resetToShortBrief = useCallback(() => {
    const reset = buildResetIntelligenceSnapshotState();
    params.setBriefIntelligenceSubStep(reset.briefIntelligenceSubStep);
    params.setIntelligenceSnapshotResult(reset.intelligenceSnapshotResult);
    params.setIntelligenceSnapshotError(reset.intelligenceSnapshotError);
    params.setIntelligenceSnapshotPhase(reset.intelligenceSnapshotPhase);
    params.setIntelligenceLlm1Done(reset.intelligenceLlm1Done);
  }, [params]);

  const moveToSnapshotConfirm = useCallback((result: AuditBriefIntelligenceSnapshotResponse, phase: 'standard' | 'early') => {
    params.setIntelligenceSnapshotResult(result);
    params.setIntelligenceSnapshotPhase(phase);
    params.setIntelligenceLlm1Done(true);
    params.setBriefIntelligenceSubStep('snapshot_confirm');
    params.setIntelligenceSnapshotError(null);
  }, [params]);

  const skipSnapshotAndGoReview = useCallback((setStep: Dispatch<SetStateAction<0 | 1 | 2 | 3>>) => {
    params.setIntelligenceSnapshotError(null);
    params.setIntelligenceLlm1Done(true);
    setStep(2);
  }, [params]);

  return {
    resetToShortBrief,
    moveToSnapshotConfirm,
    skipSnapshotAndGoReview,
  };
}
