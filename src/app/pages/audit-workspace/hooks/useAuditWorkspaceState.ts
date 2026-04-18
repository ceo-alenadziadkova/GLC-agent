import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { DOMAIN_KEYS, type AuditState, type DomainKey } from '../../../data/auditTypes';
import {
  CONSULTANT_BRIEF_LAYOUT_DEFAULT_KEY,
  clearConsultantBriefLayout,
  consultantBriefLayoutStorageKey,
  resolveConsultantBriefLayout,
  writeConsultantBriefLayout,
} from '../../../lib/client-brief-layout-preference';
import { useBriefLayoutPrefsSync } from '../../../hooks/useBriefLayoutPrefsSync';
import { visibleDomainKeysForMeta } from '../domain/policies';

type BriefLayoutChoice = 'unset' | 'classic' | 'wizard';

export function useAuditWorkspaceRouteParams() {
  const { id, domainId } = useParams<{ id: string; domainId?: string }>();
  return { id, domainId };
}

export function useAuditWorkspaceState(audit: AuditState | null, domainId?: string, id?: string) {
  const location = useLocation();
  const navigate = useNavigate();
  const [openRec, setOpenRec] = useState<number | null>(null);
  const [enrichOpen, setEnrichOpen] = useState(true);
  const [briefPanelOpen, setBriefPanelOpen] = useState(false);
  const [briefLayoutChoice, setBriefLayoutChoice] = useState<BriefLayoutChoice>('unset');
  const [activeDomain, setActiveDomain] = useState<DomainKey>(
    domainId && DOMAIN_KEYS.includes(domainId as DomainKey)
      ? (domainId as DomainKey)
      : DOMAIN_KEYS[0],
  );

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('brief') !== '1') return;
    setBriefPanelOpen(true);
    params.delete('brief');
    const query = params.toString();
    void navigate(`${location.pathname}${query ? `?${query}` : ''}`, { replace: true });
  }, [location.pathname, location.search, navigate]);

  useEffect(() => {
    if (!audit) return;
    const keys = visibleDomainKeysForMeta(audit.meta);
    const urlKey =
      domainId && keys.includes(domainId as DomainKey)
        ? (domainId as DomainKey)
        : null;

    if (urlKey) {
      setActiveDomain(urlKey);
      return;
    }
    setActiveDomain(prev => {
      if (keys.includes(prev)) return prev;
      const firstWithData = keys.find(key => audit.domains[key] != null);
      return firstWithData ?? keys[0]!;
    });
  }, [audit, domainId]);

  useEffect(() => {
    if (!id) return;
    setBriefLayoutChoice(resolveConsultantBriefLayout(id) ?? 'unset');
  }, [id]);

  const workspaceLayoutSyncKeys = useMemo(
    () => (id ? [CONSULTANT_BRIEF_LAYOUT_DEFAULT_KEY, consultantBriefLayoutStorageKey(id)] : []),
    [id],
  );

  useBriefLayoutPrefsSync(workspaceLayoutSyncKeys, () => {
    if (!id) return;
    setBriefLayoutChoice(resolveConsultantBriefLayout(id) ?? 'unset');
  });

  return {
    activeDomain,
    setActiveDomain,
    openRec,
    setOpenRec,
    enrichOpen,
    setEnrichOpen,
    briefPanelOpen,
    setBriefPanelOpen,
    briefLayoutChoice,
    setBriefLayoutChoice,
    selectBriefLayout: (mode: Exclude<BriefLayoutChoice, 'unset'>) => {
      if (!id) return;
      writeConsultantBriefLayout(id, mode);
      setBriefLayoutChoice(mode);
    },
    clearBriefLayout: () => {
      if (!id) return;
      clearConsultantBriefLayout(id);
      setBriefLayoutChoice('unset');
    },
  };
}
