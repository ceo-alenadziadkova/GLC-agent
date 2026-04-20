import {
  ArrowRight, CaretDown, Clock, Code, Copy,
} from '@phosphor-icons/react';
import { Link } from 'react-router';
import { buildAppRoute } from '../../../config/route-paths';
import {
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
import { cn } from '../../../components/ui/utils';
import { formatAppMediumDateTime } from '../../../lib/date-format';

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
  const submitted = formatAppMediumDateTime(s.submitted_at);
  const expired = Date.now() > new Date(s.expires_at).getTime();
  const norm = normalizeIntakeResponses(s.responses);

  return (
    <div className="bg-card overflow-hidden rounded-xl border">
      <div className={cn('flex items-start gap-3 px-4 py-3', open ? 'bg-muted' : 'bg-transparent')}>
        <button
          type="button"
          className="text-muted-foreground mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-expanded={open}
          aria-label={open ? ADMIN_REQUEST_QUEUE_COPY.collapseDetails : ADMIN_REQUEST_QUEUE_COPY.expandDetails}
          onClick={onToggleExpand}
        >
          <CaretDown className={cn('h-4 w-4 shrink-0 transition-transform', open ? 'rotate-180' : '')} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="text-muted-foreground text-[length:var(--text-2xs)] font-semibold uppercase tracking-wider">
            {ADMIN_REQUEST_QUEUE_COPY.rowKindClientPreBrief}
          </div>
          <div className="text-foreground truncate text-sm font-medium">{title}</div>
          <div className="text-muted-foreground mt-0.5 text-xs">
            {ADMIN_REQUEST_QUEUE_COPY.intakeSummaryLine(
              countPreBriefSatisfied(norm),
              getPreBriefSubmitSlotIds(norm).length,
              s.audit_id,
              expired,
            )}
          </div>
          <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {submitted}
            </span>
            {expired && <span className="text-warning">{ADMIN_REQUEST_QUEUE_COPY.linkExpired}</span>}
            <span>{s.audit_id ? ADMIN_REQUEST_QUEUE_COPY.linkedAudit : ADMIN_REQUEST_QUEUE_COPY.notLinkedToAudit}</span>
          </div>
        </div>
        {s.audit_id && (
          <Link
            to={buildAppRoute.audit(s.audit_id)}
            className="text-info glc-touch-target inline-flex items-center rounded-md px-1 text-xs font-medium no-underline sm:min-h-0"
          >
            {ADMIN_REQUEST_QUEUE_COPY.openAudit}
          </Link>
        )}
      </div>
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
    <div className="space-y-3 border-t px-4 pb-4 pt-0">
      <div className="flex flex-wrap gap-2 pt-3">
        <button
          type="button"
          className="glc-touch-target text-foreground inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium"
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
          className="glc-touch-target text-info inline-flex items-center gap-1.5 rounded-lg border border-info/40 px-2.5 py-1.5 text-xs font-medium no-underline"
        >
          {ADMIN_REQUEST_QUEUE_COPY.newAuditWithPrefill} <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
      <div className="bg-muted space-y-2 rounded-lg border p-3">
        <p className="text-muted-foreground text-[length:var(--text-2xs)] font-semibold uppercase tracking-wider">{ADMIN_REQUEST_QUEUE_COPY.answersSectionTitle}</p>
        <dl className="space-y-2 m-0">
          {ORDERED_PRE_BRIEF_QUESTIONS.map(q => (
            <div key={q.id}>
              <dt className="text-muted-foreground text-xs">{q.question}</dt>
              <dd className="text-foreground m-0 mt-0.5 text-sm">{formatBriefAnswerSummary(q, norm[q.id])}</dd>
            </div>
          ))}
        </dl>
      </div>
      <details className="rounded-lg border text-xs">
        <summary className="text-muted-foreground flex cursor-pointer items-center gap-2 px-3 py-2 font-medium list-none">
          <Code className="w-3.5 h-3.5" />
          {ADMIN_REQUEST_QUEUE_COPY.rawResponsesJsonSummary}
        </summary>
        <pre
          className="text-muted-foreground bg-background m-0 max-h-64 overflow-x-auto overflow-y-auto border-t p-3 text-xs leading-relaxed"
        >
          {JSON.stringify(s.responses, null, 2)}
        </pre>
      </details>
    </div>
  );
}
