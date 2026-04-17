import { useCallback, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { GLC_AUDITS_AND_AUDIT_REQUESTS_LIST } from '@glc/route-limits';
import { ADMIN_REQUEST_QUEUE_QUERY_CONFIG } from '../../../config/admin-request-queue-config';
import { api } from '../../../data/apiService';
import type { AuditRequest } from '../../../data/auditTypes';
import { glcKeys } from '../../../lib/glc-keys';
import {
  auditRequestAwaitingAdminAction,
  auditRequestPaginationMeta,
  buildAwaitingRows,
  type IntakeSubmissionQueueRow,
} from '../domain/admin-request-queue.domain';

export type AdminQueueFilter = 'all' | 'pending';

export type AdminQueuePayload = {
  requests: AuditRequest[];
  auditRequestsTotal: number;
  auditRequestsLimit: number;
  auditRequestsOffset: number;
  intakeSubmissions: IntakeSubmissionQueueRow[];
  intakeLoadErrorT: string | null;
};

export function useAdminRequestQueue() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<AdminQueueFilter>('pending');
  const [auditReqOffset, setAuditReqOffset] = useState(0);

  useEffect(() => {
    setAuditReqOffset(0);
  }, [filter]);

  const q = useQuery({
    queryKey: glcKeys.adminRequestQueue(filter, auditReqOffset),
    queryFn: async (): Promise<AdminQueuePayload> => {
      let intakeLoadErrorT: string | null = null;
      const { defaultLimit, maxLimit } = GLC_AUDITS_AND_AUDIT_REQUESTS_LIST;
      const reqLimit: number = filter === 'pending' ? maxLimit : defaultLimit;
      const reqOffset = filter === 'pending' ? 0 : auditReqOffset;
      const reqRes = await api.listAuditRequests(reqLimit, reqOffset);
      const intakeRes = await api.listIntakeSubmissions().catch((e: unknown) => {
        intakeLoadErrorT = (e as Error).message;
        return { submissions: [] as IntakeSubmissionQueueRow[] };
      });
      return {
        requests: reqRes.data,
        auditRequestsTotal: reqRes.total,
        auditRequestsLimit: reqRes.limit,
        auditRequestsOffset: reqRes.offset,
        intakeSubmissions: intakeRes.submissions as IntakeSubmissionQueueRow[],
        intakeLoadErrorT,
      };
    },
    staleTime: ADMIN_REQUEST_QUEUE_QUERY_CONFIG.staleTimeMs,
  });

  const requests = q.data?.requests ?? [];
  const auditReqTotal = q.data?.auditRequestsTotal ?? 0;
  const auditReqLimit = q.data?.auditRequestsLimit ?? GLC_AUDITS_AND_AUDIT_REQUESTS_LIST.defaultLimit;
  const auditReqPageOffset = q.data?.auditRequestsOffset ?? 0;
  const intakeSubmissions = q.data?.intakeSubmissions ?? [];
  const intakeLoadError = q.data?.intakeLoadErrorT ?? null;
  const loading = q.isPending && !q.data;
  const fetchError = q.error ? (q.error as Error).message : null;

  const [actionError, setActionError] = useState<string | null>(null);
  const error = actionError ?? fetchError;

  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState<{ id: string; text: string } | null>(null);
  const [expandedIntakeToken, setExpandedIntakeToken] = useState<string | null>(null);
  const [copiedIntakeUrl, setCopiedIntakeUrl] = useState<string | null>(null);

  const refetchQueue = useCallback(() => {
    setActionError(null);
    void queryClient.invalidateQueries({ queryKey: glcKeys.adminRequestQueueRoot });
  }, [queryClient]);

  const pendingRequestsList = requests.filter(r => auditRequestAwaitingAdminAction(r.status));
  const visible = filter === 'pending' ? pendingRequestsList : requests;
  const awaitingRows =
    filter === 'pending' ? buildAwaitingRows(pendingRequestsList, intakeSubmissions) : [];

  const pagination = auditRequestPaginationMeta({
    filter,
    total: auditReqTotal,
    limit: auditReqLimit,
    pageOffset: auditReqPageOffset,
    currentPageRowsCount: requests.length,
  });

  const approve = useCallback(
    async (id: string) => {
      setBusyId(id);
      setActionError(null);
      try {
        await api.approveAuditRequest(id);
        refetchQueue();
      } catch (e) {
        setActionError((e as Error).message);
      } finally {
        setBusyId(null);
      }
    },
    [refetchQueue],
  );

  const reject = useCallback(
    async (id: string, note: string) => {
      setBusyId(id);
      setActionError(null);
      try {
        await api.rejectAuditRequest(id, note || undefined);
        setRejectNote(null);
        refetchQueue();
      } catch (e) {
        setActionError((e as Error).message);
      } finally {
        setBusyId(null);
      }
    },
    [refetchQueue],
  );

  return {
    filter,
    setFilter,
    auditReqOffset,
    setAuditReqOffset,
    requests,
    auditReqTotal,
    auditReqLimit,
    auditReqPageOffset,
    intakeSubmissions,
    intakeLoadError,
    loading,
    error,
    awaitingRows,
    visible,
    pagination,
    busyId,
    rejectNote,
    setRejectNote,
    expandedIntakeToken,
    setExpandedIntakeToken,
    copiedIntakeUrl,
    setCopiedIntakeUrl,
    approve,
    reject,
  };
}
