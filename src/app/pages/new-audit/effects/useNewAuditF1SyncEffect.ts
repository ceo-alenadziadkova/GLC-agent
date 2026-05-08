import { useEffect, useRef } from 'react';
import { currentIntakeVersionTuple, type IntakeSurface } from '@glc/intake-core';
import { APP_FEATURE_FLAGS } from '../../../config/app-feature-flags';
import { api } from '../../../data/apiService';
import { briefResponsesToIntakeMap } from '../../../data/intakeBriefMap';
import type { BriefResponses } from '../../../data/briefQuestions';
import type { IntakeVersionTuple } from '../../../data/auditTypes';
import { BRIEF_LAYOUT_WIZARD } from '../wizard-config/wizard-constants';

export function useNewAuditF1SyncEffect(args: {
  step: number;
  noPublicWebsite: boolean;
  briefLayoutChoice: string | null;
  f1IntakeToken: string;
  pipelineGateBriefResponses: BriefResponses;
  isClientSelfServe: boolean;
  briefProductMode: 'express' | 'full';
  draftIntakeVersions: IntakeVersionTuple | null;
}) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestSeqRef = useRef(0);

  useEffect(() => {
    if (args.step !== 1 || args.noPublicWebsite || args.briefLayoutChoice !== BRIEF_LAYOUT_WIZARD) return;
    if (!args.f1IntakeToken) return;
    if (!APP_FEATURE_FLAGS.diagnosticIntakePilotEnabled || !APP_FEATURE_FLAGS.intakeNextQuestionClientEnabled) return;

    const seq = ++requestSeqRef.current;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void (async () => {
        const asMap = briefResponsesToIntakeMap(args.pipelineGateBriefResponses) as Record<string, unknown>;
        const collectionF1 = args.isClientSelfServe ? 'self_serve' : 'interview';
        const surfaceF1: IntakeSurface = args.isClientSelfServe ? 'client_form' : 'consultant_interview';
        try {
          await api.postIntakeNextQuestion(args.f1IntakeToken, {
            responses: asMap,
            productMode: args.briefProductMode,
            collectionMode: collectionF1,
            surface: surfaceF1,
            intakeVersionTuple: args.draftIntakeVersions ?? currentIntakeVersionTuple(),
          });
        } catch {
          // Route disabled or token unlinked / 404.
        }
        if (seq !== requestSeqRef.current) return;
      })();
    }, 450);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [
    args.step,
    args.noPublicWebsite,
    args.briefLayoutChoice,
    args.f1IntakeToken,
    args.pipelineGateBriefResponses,
    args.isClientSelfServe,
    args.briefProductMode,
    args.draftIntakeVersions,
  ]);
}
