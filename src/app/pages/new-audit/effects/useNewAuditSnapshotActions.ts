import { useCallback, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type {
  AuditBriefIntelligenceSnapshotResponse,
  AuditBriefIntelligenceWordingResponse,
} from '../../../data/api/brief-profile-platform';
import type { BriefResponses } from '../../../data/briefQuestions';
import type { IntakeVersionTuple } from '../../../data/auditTypes';
import { WORKSPACE_PAGE_COPY } from '../../../config/workspace-page-copy';
import { shouldOpenSnapshotGate } from '../validators/newAuditWizardGuards';
import { saveBriefBeforeIntelligence, runBriefIntelligenceSnapshotAction, runBriefIntelligenceWordingAction, getSnapshotGenericError } from '../api-actions/newAuditApiActions';
import { applyIntelligenceInferredSelections } from '../apply-intelligence-inferred';

const EMPTY_INTELLIGENCE_WORDING_UI: Pick<
  AuditBriefIntelligenceWordingResponse,
  'label_overrides' | 'hint_overrides' | 'option_display_overrides'
> = {
  label_overrides: {},
  hint_overrides: {},
  option_display_overrides: {},
};

export function useNewAuditSnapshotActions(args: {
  draftAuditId: string | null;
  isClientSelfServe: boolean;
  url: string;
  noPublicWebsite: boolean;
  name: string;
  industry: string;
  industrySpecify: string;
  responses: BriefResponses;
  responseSource: 'client' | 'consultant' | 'unknown' | 'recon_confirmed';
  briefLayoutChoice: string | null;
  preBriefToken: string | null;
  intakeTokenFromUrl: string;
  draftIntakeVersions: IntakeVersionTuple | null;
  bumpClientProjectContextSyncTick: () => void;
  snapshotMachine: {
    moveToSnapshotConfirm: (snap: AuditBriefIntelligenceSnapshotResponse, phase: 'standard' | 'early') => void;
    resetToShortBrief: () => void;
    skipSnapshotAndGoReview: (setStep: Dispatch<SetStateAction<0 | 1 | 2 | 3>>) => void;
  };
  intelligenceSnapshotPhase: 'standard' | 'early';
  intelligenceSnapshotResult: AuditBriefIntelligenceSnapshotResponse | null;
  briefIntelligenceSubStep: 'short_brief' | 'snapshot_confirm';
  intakePrefillActive: boolean;
  intelligenceLlm1Done: boolean;
  step2Complete: boolean;
  setStep: Dispatch<SetStateAction<0 | 1 | 2 | 3>>;
  setResponses: Dispatch<SetStateAction<BriefResponses>>;
  setDraftIntakeVersions: Dispatch<SetStateAction<IntakeVersionTuple | null>>;
  setIntelligenceSnapshotLoading: Dispatch<SetStateAction<boolean>>;
  setIntelligenceSnapshotError: Dispatch<SetStateAction<string | null>>;
  setIntelligenceSnapshotPhase: Dispatch<SetStateAction<'standard' | 'early'>>;
  setIntelEarlyMergePending: Dispatch<SetStateAction<boolean>>;
  setIntelligenceWordingLoading: Dispatch<SetStateAction<boolean>>;
  setIntelligenceWordingUi: Dispatch<
    SetStateAction<
      Pick<AuditBriefIntelligenceWordingResponse, 'label_overrides' | 'hint_overrides' | 'option_display_overrides'>
    >
  >;
  setBriefTailoredPhaseUnlocked: Dispatch<SetStateAction<boolean>>;
  setBasicsSubStep: Dispatch<SetStateAction<0 | 1>>;
}) {
  const lastIntelligenceSnapshotRequestEarlyRef = useRef(false);

  const runBriefIntelligenceSnapshot = useCallback(async (opts?: { earlyCapture?: boolean }) => {
    if (!args.draftAuditId) {
      args.setIntelligenceSnapshotError(WORKSPACE_PAGE_COPY.newAudit.step1.intelligenceSnapshot.missingAuditId);
      return;
    }
    args.setIntelligenceSnapshotLoading(true);
    args.setIntelligenceSnapshotError(null);
    lastIntelligenceSnapshotRequestEarlyRef.current = Boolean(opts?.earlyCapture);
    try {
      const nextVersions = await saveBriefBeforeIntelligence({
        draftAuditId: args.draftAuditId,
        isClientSelfServe: args.isClientSelfServe,
        url: args.url,
        noPublicWebsite: args.noPublicWebsite,
        name: args.name,
        industry: args.industry,
        industrySpecify: args.industrySpecify,
        responses: args.responses,
        briefLayoutChoice: args.briefLayoutChoice,
        preBriefToken: args.preBriefToken,
        intakeTokenFromUrl: args.intakeTokenFromUrl,
        draftIntakeVersions: args.draftIntakeVersions,
      });
      if (nextVersions) args.setDraftIntakeVersions(nextVersions);
      args.bumpClientProjectContextSyncTick();
      const snap = await runBriefIntelligenceSnapshotAction({
        draftAuditId: args.draftAuditId,
        earlyCapture: opts?.earlyCapture,
      });
      args.snapshotMachine.moveToSnapshotConfirm(snap, opts?.earlyCapture ? 'early' : 'standard');
    } catch (e) {
      args.setIntelligenceSnapshotPhase('standard');
      args.setIntelligenceSnapshotError(getSnapshotGenericError(e));
    } finally {
      args.setIntelligenceSnapshotLoading(false);
    }
  }, [args]);

  const runEarlyBriefIntelligenceSnapshot = useCallback(async () => {
    await runBriefIntelligenceSnapshot({ earlyCapture: true });
  }, [runBriefIntelligenceSnapshot]);

  const retryBriefIntelligenceSnapshot = useCallback(async () => {
    await runBriefIntelligenceSnapshot(lastIntelligenceSnapshotRequestEarlyRef.current ? { earlyCapture: true } : {});
  }, [runBriefIntelligenceSnapshot]);

  const handleStep1ContinueToReview = useCallback(async () => {
    if (!args.step2Complete) return;
    const useSnapshotGate = shouldOpenSnapshotGate({
      isClientSelfServe: args.isClientSelfServe,
      draftAuditId: args.draftAuditId,
      briefIntelligenceSubStep: args.briefIntelligenceSubStep,
      intakePrefillActive: args.intakePrefillActive,
    });
    if (!useSnapshotGate || args.intelligenceLlm1Done) {
      args.setStep(2);
      return;
    }
    await runBriefIntelligenceSnapshot();
  }, [args, runBriefIntelligenceSnapshot]);

  const handleIntelligenceSnapshotSkipToReview = useCallback(() => {
    args.snapshotMachine.skipSnapshotAndGoReview(args.setStep);
  }, [args]);

  const handleIntelligenceSnapshotSaveApplyAndWording = useCallback(
    async (selectedInferredIds: Set<string>) => {
      if (!args.draftAuditId || !args.intelligenceSnapshotResult) return;
      args.setIntelligenceSnapshotError(null);

      const nextResponses = applyIntelligenceInferredSelections(
        args.responses,
        args.intelligenceSnapshotResult.inferred_preview,
        selectedInferredIds,
        args.responseSource,
      );
      args.setResponses(nextResponses);

      if (args.intelligenceSnapshotPhase === 'early') {
        args.setIntelEarlyMergePending(true);
        try {
          const nextVersions = await saveBriefBeforeIntelligence({
            draftAuditId: args.draftAuditId,
            isClientSelfServe: args.isClientSelfServe,
            url: args.url,
            noPublicWebsite: args.noPublicWebsite,
            name: args.name,
            industry: args.industry,
            industrySpecify: args.industrySpecify,
            responses: nextResponses,
            briefLayoutChoice: args.briefLayoutChoice,
            preBriefToken: args.preBriefToken,
            intakeTokenFromUrl: args.intakeTokenFromUrl,
            draftIntakeVersions: args.draftIntakeVersions,
          });
          if (nextVersions) args.setDraftIntakeVersions(nextVersions);
          args.bumpClientProjectContextSyncTick();
          args.snapshotMachine.resetToShortBrief();
        } catch (e) {
          args.setIntelligenceSnapshotError(getSnapshotGenericError(e));
        } finally {
          args.setIntelEarlyMergePending(false);
        }
        return;
      }

      args.setIntelligenceWordingLoading(true);
      try {
        const nextVersions = await saveBriefBeforeIntelligence({
          draftAuditId: args.draftAuditId,
          isClientSelfServe: args.isClientSelfServe,
          url: args.url,
          noPublicWebsite: args.noPublicWebsite,
          name: args.name,
          industry: args.industry,
          industrySpecify: args.industrySpecify,
          responses: nextResponses,
          briefLayoutChoice: args.briefLayoutChoice,
          preBriefToken: args.preBriefToken,
          intakeTokenFromUrl: args.intakeTokenFromUrl,
          draftIntakeVersions: args.draftIntakeVersions,
        });
        if (nextVersions) args.setDraftIntakeVersions(nextVersions);
        args.bumpClientProjectContextSyncTick();
        const wording = await runBriefIntelligenceWordingAction(args.draftAuditId);
        args.setIntelligenceWordingUi({
          label_overrides: wording.label_overrides ?? {},
          hint_overrides: wording.hint_overrides ?? {},
          option_display_overrides: wording.option_display_overrides ?? {},
        });
        args.setBriefTailoredPhaseUnlocked(true);
        args.snapshotMachine.resetToShortBrief();
      } catch (e) {
        args.setIntelligenceSnapshotError(getSnapshotGenericError(e));
      } finally {
        args.setIntelligenceWordingLoading(false);
      }
    },
    [args],
  );

  const handleIntelligenceSnapshotBackToBriefForm = useCallback(() => {
    args.snapshotMachine.resetToShortBrief();
  }, [args]);

  const handleBackFromStep2ToStep1 = useCallback(() => {
    args.setBriefTailoredPhaseUnlocked(true);
    args.snapshotMachine.resetToShortBrief();
    args.setStep(1);
  }, [args]);

  const handleBackFromStep1ToStep0 = useCallback(() => {
    args.snapshotMachine.resetToShortBrief();
    args.setIntelligenceWordingUi({ ...EMPTY_INTELLIGENCE_WORDING_UI });
    args.setStep(0);
    args.setBasicsSubStep(0);
  }, [args]);

  return {
    runBriefIntelligenceSnapshot,
    runEarlyBriefIntelligenceSnapshot,
    retryBriefIntelligenceSnapshot,
    handleStep1ContinueToReview,
    handleIntelligenceSnapshotSkipToReview,
    handleIntelligenceSnapshotSaveApplyAndWording,
    handleIntelligenceSnapshotBackToBriefForm,
    handleBackFromStep2ToStep1,
    handleBackFromStep1ToStep0,
  };
}
