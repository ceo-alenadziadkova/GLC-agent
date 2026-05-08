import { useMemo } from 'react';
import { useQuery } from '../../../lib/tanstack-react-query';
import { api } from '../../../data/apiService';
import { useAudit } from '../../../hooks/useAudit';
import { GLC_QUERY_STALE_TIME_MS_BRIEF } from '../../../config/query-client-defaults';
import { glcKeys } from '../../../lib/glc-keys';
import { freeSnapshotPreviewFromAuditState } from '../../../lib/free-snapshot-preview-from-audit-state';
import { getSnapshotAccessBlockedState } from '../../../lib/snapshot-diagnostics';
import { clientCanViewPortalPipeline } from '../../../lib/client-portal-pipeline-access';
import { isSnapshotStyleAudit } from '../../../lib/audit-execution-plan';
import {
  deriveDomainDisplay,
  derivePortalSubtitle,
  deriveStatusLabel,
} from '../domain/view-model';

export function useClientAuditData(auditId: string) {
  const { audit: auditState, loading: auditLoading, error: auditError } = useAudit(auditId);
  const meta = auditState?.meta;
  const isCreated = meta?.status === 'created';

  const briefForGatesQuery = useQuery({
    queryKey: glcKeys.brief.detail(auditId),
    queryFn: () => api.getBrief(auditId),
    enabled: isCreated,
    staleTime: GLC_QUERY_STALE_TIME_MS_BRIEF,
  });

  const gatePayload = useMemo(() => {
    if (!isCreated || !briefForGatesQuery.data) return null;
    return { canStartPipeline: briefForGatesQuery.data.gates?.canStartPipeline === true };
  }, [briefForGatesQuery.data, isCreated]);

  const loading = auditLoading && !auditState;
  const isFreeSnapshot = meta ? isSnapshotStyleAudit(meta) : false;
  const snapshotPreview = useMemo(
    () => (auditState ? freeSnapshotPreviewFromAuditState(auditState) : null),
    [auditState],
  );
  const freeSnapshotAccess = useMemo(
    () => (snapshotPreview ? getSnapshotAccessBlockedState(snapshotPreview) : null),
    [snapshotPreview],
  );

  const canViewPipeline = useMemo(() => {
    if (!meta) return false;
    return clientCanViewPortalPipeline({
      auditMeta: meta,
      brief:
        meta.status === 'created'
          ? gatePayload
            ? { gates: { canStartPipeline: gatePayload.canStartPipeline } }
            : null
          : {},
    });
  }, [gatePayload, meta]);

  return {
    auditState,
    meta,
    loading,
    error: auditError,
    isCreated,
    isFreeSnapshot,
    gatePayload,
    canStart: gatePayload?.canStartPipeline ?? false,
    canViewPipeline,
    snapshotPreview,
    freeSnapshotAccess,
    domain: deriveDomainDisplay(auditState),
    statusLabel: deriveStatusLabel(meta),
    portalSubtitle: derivePortalSubtitle(meta, isFreeSnapshot, freeSnapshotAccess),
  };
}
