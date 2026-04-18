import { useEffect, useRef, useState } from 'react';
import { api } from '../../../data/apiService';
import type { AuditCoveragePackage } from '../../../data/auditTypes';
import { clientCanViewPortalPipeline } from '../../../lib/client-portal-pipeline-access';

type AuditMetaForGate = {
  status: string;
  execution_plan?: {
    coverage_package?: AuditCoveragePackage;
    include_strategy?: boolean;
  } | null;
} | null;

export function useClientPortalPipelineGate(args: {
  isClient: boolean;
  id: string | undefined;
  auditLoading: boolean;
  auditMeta: AuditMetaForGate;
}) {
  const { isClient, id, auditLoading, auditMeta } = args;
  const [clientPortalOk, setClientPortalOk] = useState<boolean | 'pending'>(() =>
    isClient ? 'pending' : true,
  );
  const portalGateKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isClient) {
      setClientPortalOk(true);
      return;
    }
    if (!id) {
      setClientPortalOk(false);
      return;
    }
    if (auditLoading && !auditMeta) {
      setClientPortalOk('pending');
      return;
    }
    if (!auditMeta) {
      setClientPortalOk(false);
      return;
    }

    const gateKey = `${id}:${auditMeta.status}:${auditMeta.execution_plan?.coverage_package ?? ''}:${auditMeta.execution_plan?.include_strategy === true ? 's1' : 's0'}`;
    const sameGate = portalGateKeyRef.current === gateKey;
    portalGateKeyRef.current = gateKey;

    let cancelled = false;
    if (!sameGate) {
      setClientPortalOk('pending');
    }

    void (async () => {
      try {
        if (auditMeta.status !== 'created') {
          if (!cancelled) {
            setClientPortalOk(clientCanViewPortalPipeline({ auditMeta, brief: {} }));
          }
          return;
        }
        const brief = await api.getBrief(id);
        if (cancelled) return;
        setClientPortalOk(
          clientCanViewPortalPipeline({
            auditMeta,
            brief: { gates: { canStartPipeline: brief.gates?.canStartPipeline === true } },
          }),
        );
      } catch {
        if (!cancelled) setClientPortalOk(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isClient, id, auditLoading, auditMeta]);

  return clientPortalOk;
}
