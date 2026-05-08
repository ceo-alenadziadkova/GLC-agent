import { bankIdToBriefQuestion } from '../../../../data/bankQuestionUiCatalog';
import { intakeReadinessMissingBankIdsFromEnvelopeDetails } from '../../../../lib/pipeline-intake-readiness-block-ui';
import type { AuditIssue, QuickWin, Recommendation } from '../../../../data/audit/contracts/report/report-domain.types';
import { PIPELINE_RETRY_COMMENT_MAX_LENGTH } from '../../../../config/api-paths';
import type { EditableIssueRow, EditableQuickWinRow, EditableRecommendationRow } from './phase-detail-types';

export const PIPELINE_RETRY_COMMENT_WARNING_THRESHOLD = Math.floor(PIPELINE_RETRY_COMMENT_MAX_LENGTH * 0.9);

export function intakeReadinessTriageCodesFromDetails(details: unknown): string[] | null {
  if (details == null || typeof details !== 'object') return null;
  const triage = (details as Record<string, unknown>).triage_blocking_trace_codes;
  if (!Array.isArray(triage)) return null;
  const out = triage.filter((c): c is string => typeof c === 'string');
  return out.length > 0 ? out : null;
}

export function PipelineIntakeReadinessMissingQuestions(props: {
  missingFieldsTitle: string;
  envelopeDetails: unknown;
}) {
  const ids = intakeReadinessMissingBankIdsFromEnvelopeDetails(props.envelopeDetails);
  if (ids.length === 0) return null;
  return (
    <div className="mt-3">
      <p className="text-[var(--text-secondary)] mb-1 text-xs font-semibold">{props.missingFieldsTitle}</p>
      <ul className="text-[var(--text-secondary)] list-inside list-disc space-y-1 pl-1 text-xs leading-snug">
        {ids.map(id => {
          const q = bankIdToBriefQuestion(id, 'required');
          return (
            <li key={id}>
              <span className="text-[var(--text-primary)]">{q.question}</span>{' '}
              <span className="font-mono text-[length:var(--text-2xs)] opacity-70">({id})</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function toEditableIssues(input: AuditIssue[] | undefined): EditableIssueRow[] {
  return (input ?? []).map(row => ({
    id: row.id ?? '',
    title: row.title ?? '',
    description: row.description ?? '',
    impact: row.impact ?? '',
  }));
}

export function toEditableQuickWins(input: QuickWin[] | undefined): EditableQuickWinRow[] {
  return (input ?? []).map(row => ({
    id: row.id ?? '',
    title: row.title ?? '',
    description: row.description ?? '',
    timeframe: row.timeframe ?? '',
  }));
}

export function toEditableRecommendations(input: Recommendation[] | undefined): EditableRecommendationRow[] {
  return (input ?? []).map(row => ({
    id: row.id ?? '',
    title: row.title ?? '',
    description: row.description ?? '',
    impact: row.impact ?? '',
  }));
}
