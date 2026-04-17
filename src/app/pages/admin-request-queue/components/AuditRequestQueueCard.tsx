import {
  ArrowRight, CheckCircle, ClipboardText, Spinner, XCircle,
} from '@phosphor-icons/react';
import { Link } from 'react-router';
import { buildAppRoute } from '../../../config/route-paths';
import {
  ADMIN_REQUEST_QUEUE_CHROME,
  ADMIN_REQUEST_QUEUE_COPY,
} from '../../../config/admin-request-queue-copy.en';
import { UI_SEMANTIC_COLORS } from '../../../../design-system/tokens/ui-semantic-colors';
import type { AuditRequest } from '../../../data/auditTypes';
import {
  auditRequestAwaitingAdminAction,
  auditRequestIndustryOtherSpec,
  auditRequestRowDomainLabel,
  formatAuditRequestCreatedDate,
  industryIsOtherLabel,
  previewClientIdSegment,
} from '../domain/admin-request-queue.domain';
import { AdminRequestQueueStatusBadge } from './AdminRequestQueueStatusBadge';

type RejectState = { id: string; text: string } | null;

type Props = {
  req: AuditRequest;
  showKindLabel: boolean;
  busyId: string | null;
  rejectNote: RejectState;
  setRejectNote: (v: RejectState) => void;
  onApprove: (id: string) => void;
  onReject: (id: string, note: string) => void;
};

export function AuditRequestQueueCard({
  req,
  showKindLabel,
  busyId,
  rejectNote,
  setRejectNote,
  onApprove,
  onReject,
}: Props) {
  const domain = auditRequestRowDomainLabel(req.url);
  const industryOtherSpec = auditRequestIndustryOtherSpec(req.brief_snapshot);
  const date = formatAuditRequestCreatedDate(req.created_at);
  const canAct = auditRequestAwaitingAdminAction(req.status);
  const clientSeg = previewClientIdSegment(req.client_id);

  return (
    <div
      className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-5 py-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              backgroundColor: ADMIN_REQUEST_QUEUE_CHROME.rowIconBackground,
              border: `var(--border-width-default) solid ${ADMIN_REQUEST_QUEUE_CHROME.rowIconBorder}`,
            }}
          >
            <ClipboardText className="h-5 w-5 text-[var(--glc-blue)]" />
          </div>
          <div className="min-w-0">
            {showKindLabel && (
              <div className="text-[length:var(--text-2xs)] font-semibold uppercase tracking-wider text-[var(--text-quaternary)]">
                {ADMIN_REQUEST_QUEUE_COPY.rowKindAuditRequest}
              </div>
            )}
            <div className="truncate font-medium text-[length:var(--text-sm)] text-[var(--text-primary)]">
              {domain}
            </div>
            <div className="mt-0.5 text-xs text-[var(--text-tertiary)]">
              {date} · {ADMIN_REQUEST_QUEUE_COPY.productModeLabel[req.product_mode]} · {ADMIN_REQUEST_QUEUE_COPY.clientIdPrefix} {clientSeg}…
              {req.industry ? ` · ${req.industry}` : ''}
            </div>
            {industryIsOtherLabel(req.industry) && industryOtherSpec && (
              <p className="m-0 mt-1 text-xs text-[var(--text-secondary)]">
                {ADMIN_REQUEST_QUEUE_COPY.sectorPrefix} {industryOtherSpec}
              </p>
            )}
            {req.client_notes && (
              <p className="mt-2 line-clamp-2 text-xs text-[var(--text-secondary)]">
                {req.client_notes}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <AdminRequestQueueStatusBadge status={req.status} />
          {req.audit_id && (
            <Link
              to={buildAppRoute.audit(req.audit_id)}
              className="flex items-center gap-1 text-xs font-medium text-[var(--glc-blue)] no-underline"
            >
              {ADMIN_REQUEST_QUEUE_COPY.openAudit} <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>
      </div>

      {canAct && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--border-subtle)] pt-3">
          <button
            type="button"
            disabled={busyId === req.id}
            className="px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{
              background: UI_SEMANTIC_COLORS.successMutedBg12,
              color: UI_SEMANTIC_COLORS.success,
              border: `var(--border-width-default) solid ${UI_SEMANTIC_COLORS.successBorder25}`,
              opacity: busyId === req.id ? 0.6 : 1,
            }}
            onClick={() => onApprove(req.id)}
          >
            {busyId === req.id ? <Spinner className="w-3.5 h-3.5 animate-spin inline" /> : <CheckCircle className="w-3.5 h-3.5 inline mr-1" weight="bold" />}
            {ADMIN_REQUEST_QUEUE_COPY.approveAndCreateAudit}
          </button>
          {rejectNote?.id === req.id ? (
            <div className="flex flex-col gap-2 w-full">
              <textarea
                className="w-full rounded-lg border border-[var(--border-default)] bg-transparent px-3 py-2 text-xs text-[var(--text-primary)]"
                placeholder={ADMIN_REQUEST_QUEUE_COPY.rejectReasonPlaceholder}
                rows={2}
                value={rejectNote.text}
                onChange={e => setRejectNote({ id: req.id, text: e.target.value })}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded-lg bg-[var(--ui-danger-muted-bg-12)] px-3 py-1.5 text-xs text-[var(--ui-danger-fg-strong)]"
                  onClick={() => onReject(req.id, rejectNote.text)}
                  disabled={busyId === req.id}
                >
                  {ADMIN_REQUEST_QUEUE_COPY.confirmReject}
                </button>
                <button
                  type="button"
                  className="px-3 py-1.5 text-xs text-[var(--text-tertiary)]"
                  onClick={() => setRejectNote(null)}
                >
                  {ADMIN_REQUEST_QUEUE_COPY.cancel}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              disabled={busyId === req.id}
              className="px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{
                background: UI_SEMANTIC_COLORS.dangerMutedBg,
                color: UI_SEMANTIC_COLORS.danger,
                border: `var(--border-width-default) solid ${UI_SEMANTIC_COLORS.dangerBorder20}`,
              }}
              onClick={() => setRejectNote({ id: req.id, text: '' })}
            >
              <XCircle className="w-3.5 h-3.5 inline mr-1" weight="bold" />
              {ADMIN_REQUEST_QUEUE_COPY.reject}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
