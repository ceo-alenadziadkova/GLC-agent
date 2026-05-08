import { useCallback } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { APP_FEATURE_FLAGS } from '../../../config/app-feature-flags';
import { api } from '../../../data/apiService';
import type { BriefQuestion, BriefResponses } from '../../../data/briefQuestions';
import { toUiApiErrorMessage } from '../../../lib/api-error-ui';
import { intakeProgressiveStateKey } from '../lib/intake-brief-storage';

type IntakeJourneyStage = 'fast_pass' | 'precision_pass';
type IntakeQuestionMode = 'progressive' | 'all_questions';
type TwoPhaseWave = 'none' | 'prebrief' | 'tailored_loading' | 'tailored';

export function useIntakeBriefProgressiveActions(args: {
  questionMode: IntakeQuestionMode;
  twoPhaseWave: TwoPhaseWave;
  progressiveStepIndex: number;
  progressiveQueueLength: number;
  token: string;
  responses: BriefResponses;
  journeyStage: IntakeJourneyStage;
  precisionPassCount: number;
  preBriefStepGroupLength: number;
  intakeKpiSessionIdRef: MutableRefObject<string>;
  fastPassCompletedRef: MutableRefObject<boolean>;
  setPhase: Dispatch<SetStateAction<'form' | 'review' | 'success'>>;
  setProgressiveStepIndex: Dispatch<SetStateAction<number>>;
  setJourneyStage: Dispatch<SetStateAction<IntakeJourneyStage>>;
  setQuestionMode: Dispatch<SetStateAction<IntakeQuestionMode>>;
  setTwoPhaseWave: Dispatch<SetStateAction<TwoPhaseWave>>;
  setTailoredPayload: Dispatch<SetStateAction<{ questions: BriefQuestion[]; questionIds: string[] } | null>>;
  setTailoredLabelOverrides: Dispatch<SetStateAction<Record<string, string>>>;
  setIntelligenceSnapshotNarrative: Dispatch<SetStateAction<string | null>>;
  setSubmitError: Dispatch<SetStateAction<string | null>>;
}) {
  const onAdvanceProgressive = useCallback(() => {
    if (args.questionMode === 'all_questions') {
      args.setPhase('review');
      return;
    }
    if (APP_FEATURE_FLAGS.intakeTwoPhasePublicEnabled && args.twoPhaseWave === 'tailored_loading') return;
    if (APP_FEATURE_FLAGS.intakeTwoPhasePublicEnabled && args.twoPhaseWave === 'prebrief') {
      const atLastStep = args.progressiveStepIndex >= args.progressiveQueueLength - 1;
      if (!atLastStep) {
        args.setProgressiveStepIndex(prev => prev + 1);
        return;
      }
      if (!args.token) return;
      args.setTwoPhaseWave('tailored_loading');
      args.setSubmitError(null);
      void (async () => {
        try {
          if (APP_FEATURE_FLAGS.intakeIntelligenceSnapshotEnabled) {
            const r = await api.postIntakeIntelligenceSnapshot(args.token);
            args.setIntelligenceSnapshotNarrative(r.narrative && r.narrative.trim().length > 0 ? r.narrative.trim() : null);
            args.setTailoredLabelOverrides(r.label_overrides ?? {});
            if (r.question_ids.length === 0) {
              args.setTwoPhaseWave('prebrief');
              args.setPhase('review');
              return;
            }
            args.setTailoredPayload({ questions: r.questions, questionIds: r.question_ids });
            args.setTwoPhaseWave('tailored');
            args.setProgressiveStepIndex(0);
            return;
          }
          const r = await api.getIntakeTailoredQuestions(args.token);
          if (r.question_ids.length === 0) {
            args.setTwoPhaseWave('prebrief');
            args.setPhase('review');
            return;
          }
          args.setIntelligenceSnapshotNarrative(null);
          args.setTailoredLabelOverrides({});
          args.setTailoredPayload({ questions: r.questions, questionIds: r.question_ids });
          args.setTwoPhaseWave('tailored');
          args.setProgressiveStepIndex(0);
        } catch (e) {
          args.setTwoPhaseWave('prebrief');
          args.setSubmitError(toUiApiErrorMessage(e));
        }
      })();
      return;
    }
    if (APP_FEATURE_FLAGS.intakeTwoPhasePublicEnabled && args.twoPhaseWave === 'tailored') {
      const atLast = args.progressiveStepIndex >= args.progressiveQueueLength - 1;
      if (!atLast) {
        args.setProgressiveStepIndex(prev => prev + 1);
        return;
      }
      args.setPhase('review');
      return;
    }
    const atLastStep = args.progressiveStepIndex >= args.progressiveQueueLength - 1;
    if (!atLastStep) {
      args.setProgressiveStepIndex(prev => prev + 1);
      return;
    }
    if (args.journeyStage === 'fast_pass') {
      if (!args.fastPassCompletedRef.current && args.token) {
        args.fastPassCompletedRef.current = true;
        void api.reportIntelligenceKpi(args.token, {
          event: 'fast_pass_completed',
          client_session_id: args.intakeKpiSessionIdRef.current,
        });
      }
      if (args.precisionPassCount > 0) {
        args.setJourneyStage('precision_pass');
        args.setProgressiveStepIndex(0);
      } else {
        args.setPhase('review');
      }
      return;
    }
    args.setPhase('review');
  }, [args]);

  const onBackProgressive = useCallback(() => {
    if (args.questionMode === 'all_questions') {
      args.setQuestionMode('progressive');
      return;
    }
    if (APP_FEATURE_FLAGS.intakeTwoPhasePublicEnabled && args.twoPhaseWave === 'tailored' && args.progressiveStepIndex > 0) {
      args.setProgressiveStepIndex(prev => prev - 1);
      return;
    }
    if (APP_FEATURE_FLAGS.intakeTwoPhasePublicEnabled && args.twoPhaseWave === 'tailored' && args.progressiveStepIndex === 0) {
      args.setTwoPhaseWave('prebrief');
      args.setTailoredPayload(null);
      args.setTailoredLabelOverrides({});
      args.setIntelligenceSnapshotNarrative(null);
      args.setProgressiveStepIndex(Math.max(0, args.preBriefStepGroupLength - 1));
      return;
    }
    if (APP_FEATURE_FLAGS.intakeTwoPhasePublicEnabled && args.twoPhaseWave === 'tailored_loading') {
      args.setTwoPhaseWave('prebrief');
      return;
    }
    if (args.progressiveStepIndex > 0) {
      args.setProgressiveStepIndex(prev => prev - 1);
      return;
    }
    if (args.journeyStage === 'precision_pass') {
      args.setJourneyStage('fast_pass');
      args.setProgressiveStepIndex(0);
    }
  }, [args]);

  const onSaveAndContinueLater = useCallback(() => {
    if (!args.token || typeof window === 'undefined') return;
    window.localStorage.setItem(
      intakeProgressiveStateKey(args.token),
      JSON.stringify({
        responses: args.responses,
        stage: args.journeyStage,
        mode: args.questionMode,
        stepIndex: args.progressiveStepIndex,
      }),
    );
  }, [args]);

  return { onAdvanceProgressive, onBackProgressive, onSaveAndContinueLater };
}
