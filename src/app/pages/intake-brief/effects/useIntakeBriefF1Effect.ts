import { useEffect } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { currentIntakeVersionTuple } from '@glc/intake-core';
import { api } from '../../../data/apiService';
import { briefResponsesToIntakeMap } from '../../../data/intakeBriefMap';
import type { BriefResponses } from '../../../data/briefQuestions';
import { isIntakeF1Enabled } from '../guards/intakeBriefGuards';

type IntakeF1State = {
  status: 'idle' | 'loading' | 'ok' | 'unavailable';
  decision: {
    action: 'ask' | 'stop';
    questionId: string | null;
    reason: string;
    caseKeys: string[];
  } | null;
};

export function useIntakeBriefF1Effect(args: {
  token: string;
  loading: boolean;
  phase: 'form' | 'review' | 'success';
  responses: BriefResponses;
  intakeF1DebounceRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  intakeF1RequestSeqRef: MutableRefObject<number>;
  setIntakeF1: Dispatch<SetStateAction<IntakeF1State>>;
}) {
  useEffect(() => {
    if (!args.token || args.loading || args.phase !== 'form') return;
    if (!isIntakeF1Enabled()) return;

    const seq = ++args.intakeF1RequestSeqRef.current;
    if (args.intakeF1DebounceRef.current) clearTimeout(args.intakeF1DebounceRef.current);
    args.intakeF1DebounceRef.current = setTimeout(() => {
      void (async () => {
        args.setIntakeF1(prev => ({ status: 'loading', decision: prev.decision }));
        const asMap = briefResponsesToIntakeMap(args.responses) as Record<string, unknown>;
        try {
          const result = await api.postIntakeNextQuestion(args.token, {
            responses: asMap,
            productMode: 'full',
            collectionMode: 'pre_brief',
            surface: 'client_form',
            intakeVersionTuple: currentIntakeVersionTuple(),
          });
          if (seq !== args.intakeF1RequestSeqRef.current) return;
          args.setIntakeF1({
            status: 'ok',
            decision: {
              action: result.action,
              questionId: result.questionId,
              reason: result.reason,
              caseKeys: result.caseKeys,
            },
          });
        } catch {
          if (seq !== args.intakeF1RequestSeqRef.current) return;
          args.setIntakeF1({ status: 'unavailable', decision: null });
        }
      })();
    }, 450);

    return () => {
      if (args.intakeF1DebounceRef.current) clearTimeout(args.intakeF1DebounceRef.current);
    };
  }, [
    args.token,
    args.loading,
    args.phase,
    args.responses,
    args.intakeF1DebounceRef,
    args.intakeF1RequestSeqRef,
    args.setIntakeF1,
  ]);
}
