import { useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { api } from '../../../data/apiService';
import type { BriefSchemaSnapshot } from '../../../data/api/brief-profile-platform';
import { BRIEF_EXECUTION_DIAGNOSTIC_DEBOUNCE_MS } from '../../../config/client-analytics-batching';
import { BRIEF_LAYOUT_WIZARD } from '../wizard-config/wizard-constants';

export function getVisibleQuestionIdsFromBriefPayload(payload: { questions?: unknown[] }): string[] {
  if (!Array.isArray(payload.questions)) return [];
  return payload.questions
    .map((q): string =>
      q && typeof q === 'object' && q !== null && 'id' in q ? String((q as { id?: unknown }).id ?? '') : '',
    )
    .filter(id => id.length > 0);
}

export function useNewAuditBriefDiagnosticsEffect(args: {
  step: number;
  draftAuditId: string | null;
  noPublicWebsite: boolean;
  briefLayoutChoice: string | null;
  responsesFingerprint: string;
  setBriefExecutionDiagnostic: Dispatch<
    SetStateAction<Pick<BriefSchemaSnapshot, 'readiness' | 'critical_signals' | 'remediation_queue'> | null>
  >;
  setBriefWizardServerVisibleQuestionIds: Dispatch<SetStateAction<string[] | undefined>>;
  setBriefExecutionDiagnosticLoading: Dispatch<SetStateAction<boolean>>;
  setBriefExecutionDiagnosticError: Dispatch<SetStateAction<boolean>>;
}) {
  useEffect(() => {
    if (
      args.step !== 1 ||
      !args.draftAuditId ||
      args.noPublicWebsite ||
      args.briefLayoutChoice !== BRIEF_LAYOUT_WIZARD
    ) {
      args.setBriefExecutionDiagnostic(null);
      args.setBriefWizardServerVisibleQuestionIds(undefined);
      args.setBriefExecutionDiagnosticLoading(false);
      args.setBriefExecutionDiagnosticError(false);
      return;
    }

    let cancelled = false;
    args.setBriefExecutionDiagnosticLoading(true);
    args.setBriefExecutionDiagnosticError(false);
    const tid = window.setTimeout(() => {
      void api
        .getBrief(args.draftAuditId as string)
        .then(payload => {
          if (cancelled) return;
          const visibleFromBrief = getVisibleQuestionIdsFromBriefPayload(payload);
          args.setBriefWizardServerVisibleQuestionIds(visibleFromBrief.length > 0 ? visibleFromBrief : undefined);
          if (payload.readiness != null && payload.critical_signals != null) {
            args.setBriefExecutionDiagnostic({
              readiness: payload.readiness,
              critical_signals: payload.critical_signals,
              remediation_queue: payload.remediation_queue ?? [],
            });
          } else {
            args.setBriefExecutionDiagnostic(null);
          }
          args.setBriefExecutionDiagnosticLoading(false);
        })
        .catch(() => {
          if (!cancelled) {
            args.setBriefExecutionDiagnosticError(true);
            args.setBriefWizardServerVisibleQuestionIds(undefined);
            args.setBriefExecutionDiagnosticLoading(false);
          }
        });
    }, BRIEF_EXECUTION_DIAGNOSTIC_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(tid);
    };
  }, [
    args.step,
    args.draftAuditId,
    args.noPublicWebsite,
    args.briefLayoutChoice,
    args.responsesFingerprint,
    args.setBriefExecutionDiagnostic,
    args.setBriefWizardServerVisibleQuestionIds,
    args.setBriefExecutionDiagnosticLoading,
    args.setBriefExecutionDiagnosticError,
  ]);
}
