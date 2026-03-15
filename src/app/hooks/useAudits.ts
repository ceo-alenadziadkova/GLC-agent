import { useState, useEffect, useCallback } from 'react';
import { api } from '../data/apiService';
import type { AuditMeta } from '../data/auditTypes';

export function useAudits() {
  const [audits, setAudits] = useState<AuditMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listAudits();
      setAudits(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const deleteAudit = useCallback(async (id: string) => {
    try {
      await api.deleteAudit(id);
      setAudits(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  return { audits, loading, error, reload: load, deleteAudit };
}
