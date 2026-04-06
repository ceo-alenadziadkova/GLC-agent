import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useLocation } from 'react-router';

export type ClientPortalPipelineContextValue = {
  auditId: string | null;
  allowed: boolean;
  setPipelineAccess: (auditId: string | null, allowed: boolean) => void;
};

const ClientPortalPipelineContext = createContext<ClientPortalPipelineContextValue | null>(null);

export function ClientPortalPipelineProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [auditId, setAuditId] = useState<string | null>(null);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const p = location.pathname;
    if (p === '/portal' || p === '/portal/audit/new') {
      setAuditId(null);
      setAllowed(false);
    }
  }, [location.pathname]);

  const setPipelineAccess = useCallback((nextAuditId: string | null, nextAllowed: boolean) => {
    setAuditId(nextAuditId);
    setAllowed(nextAllowed);
  }, []);

  const value = useMemo(
    () => ({ auditId, allowed, setPipelineAccess }),
    [auditId, allowed, setPipelineAccess],
  );

  return (
    <ClientPortalPipelineContext.Provider value={value}>{children}</ClientPortalPipelineContext.Provider>
  );
}

export function useClientPortalPipeline(): ClientPortalPipelineContextValue {
  const ctx = useContext(ClientPortalPipelineContext);
  if (!ctx) {
    throw new Error('useClientPortalPipeline must be used within ClientPortalPipelineProvider');
  }
  return ctx;
}

/** For AppShell when used outside provider (consultant routes). */
export function useClientPortalPipelineOptional(): ClientPortalPipelineContextValue | null {
  return useContext(ClientPortalPipelineContext);
}
