import { useEffect } from 'react';
import type { MutableRefObject } from 'react';
import { computePilotCriticalBottleneckRank } from '@glc/intake-core';
import { apiIntakeIntelligenceKpi } from '../../../config/api-paths';
import { API_URL } from '../../../data/api-http';
import { api } from '../../../data/apiService';
import { briefResponsesToIntakeMap } from '../../../data/intakeBriefMap';
import { computeKpiCaseKeys } from '../../../lib/intake-kpi-case-keys';
import type { BriefResponses } from '../../../data/briefQuestions';

export function useIntakeBriefKpiEffects(args: {
  loading: boolean;
  token: string;
  phase: 'form' | 'review' | 'success';
  kpiVisibleBankIds: string[];
  responses: BriefResponses;
  journeyStage: 'fast_pass' | 'precision_pass';
  intakeKpiShownQuestionIdsRef: MutableRefObject<Set<string>>;
  intakeKpiBottleneckRankRef: MutableRefObject<number | null>;
  intakeKpiSessionIdRef: MutableRefObject<string>;
  intakeKpiHadActivityRef: MutableRefObject<boolean>;
  fastPassStartedRef: MutableRefObject<boolean>;
  precisionPassStartedRef: MutableRefObject<boolean>;
}) {
  useEffect(() => {
    if (args.loading || !args.token || args.phase !== 'form') return;
    if (args.kpiVisibleBankIds.length === 0) return;

    const io = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          const bankId = el.id?.replace(/^intake-q-/, '') ?? '';
          if (!bankId || args.intakeKpiShownQuestionIdsRef.current.has(bankId)) continue;
          args.intakeKpiShownQuestionIdsRef.current.add(bankId);
          const asMap = briefResponsesToIntakeMap(args.responses) as Record<string, unknown>;
          const bottleneck = computePilotCriticalBottleneckRank({
            responses: asMap,
            plan: { eligible: args.kpiVisibleBankIds },
          });
          const prev = args.intakeKpiBottleneckRankRef.current;
          const confidenceMoved = bottleneck != null && prev != null && bottleneck > prev;
          if (bottleneck != null) {
            args.intakeKpiBottleneckRankRef.current = bottleneck;
          }
          void api.reportIntelligenceKpi(args.token, {
            event: 'question_shown',
            question_id: bankId,
            client_session_id: args.intakeKpiSessionIdRef.current,
            case_keys: computeKpiCaseKeys(asMap, args.kpiVisibleBankIds),
            ...(confidenceMoved ? { confidence_moved: true } : {}),
          });
        }
      },
      { root: null, threshold: 0.25 },
    );

    const handle = window.requestAnimationFrame(() => {
      for (const id of args.kpiVisibleBankIds) {
        const node = document.getElementById(`intake-q-${id}`);
        if (node) io.observe(node);
      }
    });

    return () => {
      window.cancelAnimationFrame(handle);
      io.disconnect();
    };
  }, [args]);

  useEffect(() => {
    if (!args.token || args.phase !== 'form') return;
    if (!args.fastPassStartedRef.current && args.journeyStage === 'fast_pass') {
      args.fastPassStartedRef.current = true;
      void api.reportIntelligenceKpi(args.token, {
        event: 'fast_pass_started',
        client_session_id: args.intakeKpiSessionIdRef.current,
      });
    }
    if (!args.precisionPassStartedRef.current && args.journeyStage === 'precision_pass') {
      args.precisionPassStartedRef.current = true;
      void api.reportIntelligenceKpi(args.token, {
        event: 'precision_pass_started',
        client_session_id: args.intakeKpiSessionIdRef.current,
      });
    }
  }, [args]);

  useEffect(() => {
    if (!args.token) return;
    const onPageHide = () => {
      if (!args.intakeKpiHadActivityRef.current) return;
      if (args.phase !== 'form') return;
      const payload = JSON.stringify({
        event: 'drop_off' as const,
        client_session_id: args.intakeKpiSessionIdRef.current,
      });
      const url = `${API_URL}${apiIntakeIntelligenceKpi(args.token)}`;
      if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
        navigator.sendBeacon(url, new Blob([payload], { type: 'application/json' }));
      }
    };
    window.addEventListener('pagehide', onPageHide);
    return () => window.removeEventListener('pagehide', onPageHide);
  }, [args]);
}
