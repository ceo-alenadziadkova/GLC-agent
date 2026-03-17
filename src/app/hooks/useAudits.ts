import { useState, useEffect, useCallback } from 'react';
import { api } from '../data/apiService';
import type { AuditMeta } from '../data/auditTypes';

export function useAudits(limit = 50) {
  const [audits, setAudits] = useState<AuditMeta[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (newOffset = 0) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listAudits(limit, newOffset);
      setAudits(res.data);
      setTotal(res.total);
      setOffset(newOffset);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => { load(0); }, [load]);

  const loadMore = useCallback(() => {
    if (offset + limit < total) load(offset + limit);
  }, [load, offset, limit, total]);

  const deleteAudit = useCallback(async (id: string) => {
    try {
      await api.deleteAudit(id);
      setAudits(prev => prev.filter(a => a.id !== id));
      setTotal(prev => prev - 1);
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  return {
    audits, total, loading, error,
    hasMore: offset + limit < total,
    reload: () => load(0),
    loadMore,
    deleteAudit,
  };
}
