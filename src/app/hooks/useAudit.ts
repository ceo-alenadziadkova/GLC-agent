import { useState, useEffect, useCallback } from 'react';
import { api } from '../data/apiService';
import type { AuditState } from '../data/auditTypes';

export function useAudit(auditId: string | undefined) {
  const [audit, setAudit] = useState<AuditState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!auditId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAudit(auditId);
      setAudit(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [auditId]);

  useEffect(() => {
    load();
  }, [load]);

  return { audit, loading, error, reload: load };
}
