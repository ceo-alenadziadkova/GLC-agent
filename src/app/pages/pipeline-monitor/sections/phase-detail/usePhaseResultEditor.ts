import { useCallback, useState } from 'react';
import { api } from '../../../../data/apiService';
import type { AuditState } from '../../../../data/audit/contracts/state/audit-state.types';
import type { AuditIssue, QuickWin, Recommendation } from '../../../../data/audit/contracts/report/report-domain.types';
import type { PipelineMonitorCopy } from '../../../../config/pipeline-monitor-copy';
import { STRATEGY_PHASE_ID } from '../../phase-meta';
import type { PhaseView } from '../../types';
import {
  toEditableIssues,
  toEditableQuickWins,
  toEditableRecommendations,
} from './phase-detail-helpers';
import type { EditableIssueRow, EditableQuickWinRow, EditableRecommendationRow } from './phase-detail-types';

type PhaseResultEditorCopy = PipelineMonitorCopy['detail']['phaseResultEditor'];

function buildEditablePhaseResultPayload(args: {
  audit: AuditState | null;
  selectedPhase: PhaseView;
}): Record<string, unknown> | null {
  const { audit, selectedPhase } = args;
  if (!audit) return null;
  if (selectedPhase.id === STRATEGY_PHASE_ID) {
    if (!audit.strategy) return null;
    return {
      executive_summary: audit.strategy.executive_summary,
      quick_wins: audit.strategy.quick_wins,
      medium_term: audit.strategy.medium_term,
      strategic: audit.strategy.strategic,
    };
  }
  const domain = Object.values(audit.domains).find((row) => row?.phase_number === selectedPhase.id) ?? null;
  if (!domain) return null;
  return {
    label: domain.label,
    summary: domain.summary,
    strengths: domain.strengths,
    weaknesses: domain.weaknesses,
    issues: domain.issues,
    quick_wins: domain.quick_wins,
    recommendations: domain.recommendations,
  };
}

export function usePhaseResultEditor(args: {
  audit: AuditState | null;
  auditId: string | undefined;
  selectedPhase: PhaseView;
  onRefreshAfterPhaseEdit: () => Promise<void>;
  editorCopy: PhaseResultEditorCopy;
}) {
  const { audit, auditId, selectedPhase, onRefreshAfterPhaseEdit, editorCopy } = args;

  const [isOpen, setIsOpen] = useState(false);
  const [labelDraft, setLabelDraft] = useState('');
  const [summaryDraft, setSummaryDraft] = useState('');
  const [strengthsDraft, setStrengthsDraft] = useState('');
  const [weaknessesDraft, setWeaknessesDraft] = useState('');
  const [executiveSummaryDraft, setExecutiveSummaryDraft] = useState('');
  const [issuesDraft, setIssuesDraft] = useState<EditableIssueRow[]>([]);
  const [quickWinsDraft, setQuickWinsDraft] = useState<EditableQuickWinRow[]>([]);
  const [recommendationsDraft, setRecommendationsDraft] = useState<EditableRecommendationRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = useCallback(() => {
    const payload = buildEditablePhaseResultPayload({ audit, selectedPhase });
    if (!payload) return;
    setLabelDraft(typeof payload.label === 'string' ? payload.label : '');
    setSummaryDraft(typeof payload.summary === 'string' ? payload.summary : '');
    setStrengthsDraft(
      Array.isArray(payload.strengths) ? payload.strengths.filter((v): v is string => typeof v === 'string').join('\n') : '',
    );
    setWeaknessesDraft(
      Array.isArray(payload.weaknesses) ? payload.weaknesses.filter((v): v is string => typeof v === 'string').join('\n') : '',
    );
    setExecutiveSummaryDraft(typeof payload.executive_summary === 'string' ? payload.executive_summary : '');
    setIssuesDraft(toEditableIssues((payload.issues as AuditIssue[] | undefined) ?? []));
    setQuickWinsDraft(toEditableQuickWins((payload.quick_wins as QuickWin[] | undefined) ?? []));
    setRecommendationsDraft(toEditableRecommendations((payload.recommendations as Recommendation[] | undefined) ?? []));
    setError(null);
    setIsOpen(true);
  }, [audit, selectedPhase]);

  const cancel = useCallback(() => {
    setIsOpen(false);
  }, []);

  const save = useCallback(async () => {
    if (!auditId || selectedPhase.id < 1 || selectedPhase.id > 7 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const normalizeMultiline = (raw: string): string[] =>
        raw
          .split('\n')
          .map((v) => v.trim())
          .filter((v) => v.length > 0);
      const resultPatch =
        selectedPhase.id === STRATEGY_PHASE_ID
          ? {
              executive_summary: executiveSummaryDraft.trim(),
            }
          : {
              label: labelDraft.trim(),
              summary: summaryDraft.trim(),
              strengths: normalizeMultiline(strengthsDraft),
              weaknesses: normalizeMultiline(weaknessesDraft),
              issues: issuesDraft.map((row) => ({
                id: row.id.trim(),
                title: row.title.trim(),
                description: row.description.trim(),
                impact: row.impact.trim(),
              })),
              quick_wins: quickWinsDraft.map((row) => ({
                id: row.id.trim(),
                title: row.title.trim(),
                description: row.description.trim(),
                timeframe: row.timeframe.trim(),
              })),
              recommendations: recommendationsDraft.map((row) => ({
                id: row.id.trim(),
                title: row.title.trim(),
                description: row.description.trim(),
                impact: row.impact.trim(),
              })),
            };
      if (selectedPhase.id === STRATEGY_PHASE_ID) {
        if ((resultPatch.executive_summary ?? '').trim().length === 0) {
          setError(editorCopy.validation.executiveSummaryRequired);
          return;
        }
      } else {
        if ((resultPatch.label ?? '').trim().length === 0) {
          setError(editorCopy.validation.labelRequired);
          return;
        }
        if ((resultPatch.summary ?? '').trim().length === 0) {
          setError(editorCopy.validation.summaryRequired);
          return;
        }
        const invalidIssue = resultPatch.issues.find(
          (row) =>
            row.id.length === 0 ||
            row.title.length === 0 ||
            row.description.length === 0 ||
            row.impact.length === 0,
        );
        if (invalidIssue) {
          setError(editorCopy.validation.issueFields);
          return;
        }
        const invalidQuickWin = resultPatch.quick_wins.find(
          (row) =>
            row.id.length === 0 ||
            row.title.length === 0 ||
            row.description.length === 0 ||
            row.timeframe.length === 0,
        );
        if (invalidQuickWin) {
          setError(editorCopy.validation.quickWinFields);
          return;
        }
        const invalidRecommendation = resultPatch.recommendations.find(
          (row) =>
            row.id.length === 0 ||
            row.title.length === 0 ||
            row.description.length === 0 ||
            row.impact.length === 0,
        );
        if (invalidRecommendation) {
          setError(editorCopy.validation.recommendationFields);
          return;
        }
      }
      await api.patchPipelinePhaseResult(auditId, selectedPhase.id, { result: resultPatch });
      await onRefreshAfterPhaseEdit();
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : editorCopy.validation.saveFailedFallback);
    } finally {
      setBusy(false);
    }
  }, [
    auditId,
    busy,
    editorCopy,
    executiveSummaryDraft,
    issuesDraft,
    labelDraft,
    quickWinsDraft,
    recommendationsDraft,
    selectedPhase.id,
    strengthsDraft,
    summaryDraft,
    weaknessesDraft,
    onRefreshAfterPhaseEdit,
  ]);

  return {
    isOpen,
    busy,
    error,
    open,
    cancel,
    save,
    labelDraft,
    setLabelDraft,
    summaryDraft,
    setSummaryDraft,
    strengthsDraft,
    setStrengthsDraft,
    weaknessesDraft,
    setWeaknessesDraft,
    executiveSummaryDraft,
    setExecutiveSummaryDraft,
    issuesDraft,
    setIssuesDraft,
    quickWinsDraft,
    setQuickWinsDraft,
    recommendationsDraft,
    setRecommendationsDraft,
  };
}
