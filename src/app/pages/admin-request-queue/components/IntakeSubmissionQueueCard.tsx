import type { CSSProperties } from 'react';
import {
  ArrowRight, CaretDown, Clock, Code, Copy,
} from '@phosphor-icons/react';
import { Link } from 'react-router';
import { buildAppRoute } from '../../../config/route-paths';
import {
  ADMIN_REQUEST_QUEUE_CHROME,
  ADMIN_REQUEST_QUEUE_COPY,
} from '../../../config/admin-request-queue-copy.en';
import { UI_FEEDBACK_FLASH_MS } from '../../../config/ui-feedback-defaults';
import {
  countPreBriefSatisfied,
  formatBriefAnswerSummary,
  getPreBriefSubmitSlotIds,
} from '../../../data/briefQuestions';
import {
  normalizeIntakeResponses,
  type IntakeSubmissionQueueRow,
} from '../domain/admin-request-queue.domain';
import { ORDERED_PRE_BRIEF_QUESTIONS } from '../domain/ordered-pre-brief-questions';

type Props = {
  submission: IntakeSubmissionQueueRow;
  expanded: boolean;
  onToggleExpand: () => void;
  copiedIntakeUrl: string | null;
  onCopiedIntakeUrl: (token: string | null) => void;
};

export function IntakeSubmissionQueueCard({
  submission: s,
  expanded: open,
  onToggleExpand,
  copiedIntakeUrl,
  onCopiedIntakeUrl,
}: Props) {
  const meta = s.metadata as Record<string, string | undefined>;
  const title = (meta.company_name as string | undefined)?.trim() || ADMIN_REQUEST_QUEUE_COPY.intakeTitleFallback;
  const submitted = new Date(s.submitted_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  const expired = Date.now() > new Date(s.expires_at).getTime();
  const norm = normalizeIntakeResponses(s.responses);

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}
    >
      <button
        type="button"
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
        style={{ background: open ? 'var(--bg-inset)' : 'transparent', cursor: 'pointer' }}
        onClick={onToggleExpand}
      >
        <CaretDown className="w-4 h-4 shrink-0 transition-transform" style={{ transform: open ? 'rotate(180deg)' : 'none', color: 'var(--text-tertiary)' }} />
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-quaternary)' }}>
            {ADMIN_REQUEST_QUEUE_COPY.rowKindClientPreBrief}
          </div>
          <div className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>{title}</div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {ADMIN_REQUEST_QUEUE_COPY.intakeSummaryLine(
              countPreBriefSatisfied(norm),
              getPreBriefSubmitSlotIds(norm).length,
              s.audit_id,
              expired,
            )}
          </div>
          <div className="text-xs mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5" style={{ color: 'var(--text-tertiary)' }}>
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {submitted}
            </span>
            {expired && <span style={{ color: 'var(--score-2)' }}>{ADMIN_REQUEST_QUEUE_COPY.linkExpired}</span>}
            {s.audit_id ? (
              <Link to={buildAppRoute.audit(s.audit_id)} className="no-underline font-medium" style={{ color: 'var(--glc-blue)' }} onClick={e => e.stopPropagation()}>
                {ADMIN_REQUEST_QUEUE_COPY.linkedAudit}
              </Link>
            ) : (
              <span>{ADMIN_REQUEST_QUEUE_COPY.notLinkedToAudit}</span>
            )}
          </div>
        </div>
      </button>
      {open && (
        <IntakeSubmissionExpandedBody
          s={s}
          norm={norm}
          copiedIntakeUrl={copiedIntakeUrl}
          onCopiedIntakeUrl={onCopiedIntakeUrl}
        />
      )}
    </div>
  );
}

function IntakeSubmissionExpandedBody({
  s,
  norm,
  copiedIntakeUrl,
  onCopiedIntakeUrl,
}: {
  s: IntakeSubmissionQueueRow;
  norm: ReturnType<typeof normalizeIntakeResponses>;
  copiedIntakeUrl: string | null;
  onCopiedIntakeUrl: (token: string | null) => void;
}) {
  return (
    <div className="px-4 pb-4 pt-0 space-y-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
      <div className="flex flex-wrap gap-2 pt-3">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium"
          style={{ border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', cursor: 'pointer' }}
          onClick={() => {
            void navigator.clipboard.writeText(s.intake_url).then(() => {
              onCopiedIntakeUrl(s.token);
              window.setTimeout(() => onCopiedIntakeUrl(null), UI_FEEDBACK_FLASH_MS);
            });
          }}
        >
          <Copy className="w-3.5 h-3.5" />
          {copiedIntakeUrl === s.token ? ADMIN_REQUEST_QUEUE_COPY.copied : ADMIN_REQUEST_QUEUE_COPY.copyClientLink}
        </button>
        <Link
          to={buildAppRoute.auditNewWithIntakeToken(s.token)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium no-underline"
          style={{ border: `1px solid ${ADMIN_REQUEST_QUEUE_CHROME.prefillCtaBorder}`, color: 'var(--glc-blue)' }}
        >
          {ADMIN_REQUEST_QUEUE_COPY.newAuditWithPrefill} <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
      <div className="rounded-lg p-3 space-y-2" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}>
        <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-quaternary)' }}>{ADMIN_REQUEST_QUEUE_COPY.answersSectionTitle}</p>
        <dl className="space-y-2 m-0">
          {ORDERED_PRE_BRIEF_QUESTIONS.map(q => (
            <div key={q.id}>
              <dt className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{q.question}</dt>
              <dd className="text-sm m-0 mt-0.5" style={{ color: 'var(--text-primary)' }}>{formatBriefAnswerSummary(q, norm[q.id])}</dd>
            </div>
          ))}
        </dl>
      </div>
      <details className="rounded-lg text-xs" style={{ border: '1px solid var(--border-subtle)' }}>
        <summary className="px-3 py-2 cursor-pointer flex items-center gap-2 font-medium" style={{ color: 'var(--text-secondary)', listStyle: 'none' } as CSSProperties}>
          <Code className="w-3.5 h-3.5" />
          {ADMIN_REQUEST_QUEUE_COPY.rawResponsesJsonSummary}
        </summary>
        <pre
          className="m-0 p-3 overflow-x-auto max-h-64 overflow-y-auto text-[11px] leading-relaxed"
          style={{ background: 'var(--bg-canvas)', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-subtle)' }}
        >
          {JSON.stringify(s.responses, null, 2)}
        </pre>
      </details>
    </div>
  );
}
