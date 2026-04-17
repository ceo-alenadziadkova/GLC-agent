import {
  ArrowRight, CheckCircle, ClipboardText, Spinner, XCircle,
} from '@phosphor-icons/react';
import { Link } from 'react-router';
import { buildAppRoute } from '../../../config/route-paths';
import {
  ADMIN_REQUEST_QUEUE_CHROME,
  ADMIN_REQUEST_QUEUE_COPY,
} from '../../../config/admin-request-queue-copy.en';
import { UI_SEMANTIC_COLORS } from '../../../config/ui-semantic-colors';
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
      className="rounded-xl px-5 py-4"
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              backgroundColor: ADMIN_REQUEST_QUEUE_CHROME.rowIconBackground,
              border: `1px solid ${ADMIN_REQUEST_QUEUE_CHROME.rowIconBorder}`,
            }}
          >
            <ClipboardText className="w-5 h-5" style={{ color: 'var(--glc-blue)' }} />
          </div>
          <div className="min-w-0">
            {showKindLabel && (
              <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-quaternary)' }}>
                {ADMIN_REQUEST_QUEUE_COPY.rowKindAuditRequest}
              </div>
            )}
            <div className="font-medium truncate" style={{ color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}>
              {domain}
            </div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
              {date} · {ADMIN_REQUEST_QUEUE_COPY.productModeLabel[req.product_mode]} · {ADMIN_REQUEST_QUEUE_COPY.clientIdPrefix} {clientSeg}…
              {req.industry ? ` · ${req.industry}` : ''}
            </div>
            {industryIsOtherLabel(req.industry) && industryOtherSpec && (
              <p className="text-xs mt-1 m-0" style={{ color: 'var(--text-secondary)' }}>
                {ADMIN_REQUEST_QUEUE_COPY.sectorPrefix} {industryOtherSpec}
              </p>
            )}
            {req.client_notes && (
              <p className="text-xs mt-2 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
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
              className="text-xs font-medium no-underline flex items-center gap-1"
              style={{ color: 'var(--glc-blue)' }}
            >
              {ADMIN_REQUEST_QUEUE_COPY.openAudit} <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>
      </div>

      {canAct && (
        <div className="mt-4 pt-3 flex flex-wrap gap-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <button
            type="button"
            disabled={busyId === req.id}
            className="px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{
              background: UI_SEMANTIC_COLORS.successMutedBg12,
              color: UI_SEMANTIC_COLORS.success,
              border: UI_SEMANTIC_COLORS.successBorder25,
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
                className="w-full rounded-lg px-3 py-2 text-xs bg-transparent"
                style={{ border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                placeholder={ADMIN_REQUEST_QUEUE_COPY.rejectReasonPlaceholder}
                rows={2}
                value={rejectNote.text}
                onChange={e => setRejectNote({ id: req.id, text: e.target.value })}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-lg text-xs"
                  style={{ background: UI_SEMANTIC_COLORS.dangerMutedBg12, color: UI_SEMANTIC_COLORS.danger }}
                  onClick={() => onReject(req.id, rejectNote.text)}
                  disabled={busyId === req.id}
                >
                  {ADMIN_REQUEST_QUEUE_COPY.confirmReject}
                </button>
                <button type="button" className="px-3 py-1.5 text-xs" style={{ color: 'var(--text-tertiary)' }} onClick={() => setRejectNote(null)}>
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
                border: UI_SEMANTIC_COLORS.dangerBorder20,
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
