import { useCallback, useEffect, useState } from 'react';

import type { DomainKey } from '@glc/intake-core';

import { api } from '../data/apiService';
import type { StrategyLabContextView, StrategyRoadmap } from '../data/audit/contracts/report/report-domain.types';
import { STRATEGY_LAB_COPY } from '../config/strategy-lab-copy';
import { toast } from 'sonner';

type UseStrategyLabContextPreferencesOptions = {
  auditId: string;
  strategy: StrategyRoadmap;
  onReload: () => void;
  mergeStrategyLabContextInAuditCache?: (strategy_lab_context: StrategyLabContextView) => void;
};

export function useStrategyLabContextPreferences({
  auditId,
  strategy,
  onReload,
  mergeStrategyLabContextInAuditCache,
}: UseStrategyLabContextPreferencesOptions) {
  const [stage2Selection, setStage2Selection] = useState<DomainKey[]>(
    () => strategy.strategy_lab_context?.director_stage2_domains ?? [],
  );
  const [stage2Working, setStage2Working] = useState(false);
  const [preserveBoardIdentityOnRename, setPreserveBoardIdentityOnRename] = useState<boolean>(
    () => strategy.strategy_lab_context?.preserve_board_identity_on_rename === true,
  );
  const [boardIdentityWorking, setBoardIdentityWorking] = useState(false);

  useEffect(() => {
    setStage2Selection(strategy.strategy_lab_context?.director_stage2_domains ?? []);
  }, [strategy.strategy_lab_context?.director_stage2_domains]);

  useEffect(() => {
    setPreserveBoardIdentityOnRename(strategy.strategy_lab_context?.preserve_board_identity_on_rename === true);
  }, [strategy.strategy_lab_context?.preserve_board_identity_on_rename]);

  const toggleStage2Domain = useCallback((d: DomainKey) => {
    setStage2Selection(prev => (prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]));
  }, []);

  const handleSaveStage2Intent = useCallback(async () => {
    setStage2Working(true);
    try {
      const res = await api.patchStrategyLabContext(auditId, {
        director_stage2_domains: stage2Selection.length > 0 ? stage2Selection : null,
      });
      mergeStrategyLabContextInAuditCache?.(res.strategy_lab_context);
      toast.success(STRATEGY_LAB_COPY.directorStage2Intent.saved);
      onReload();
    } catch {
      toast.error(STRATEGY_LAB_COPY.directorStage2Intent.saveFailed);
    } finally {
      setStage2Working(false);
    }
  }, [auditId, mergeStrategyLabContextInAuditCache, onReload, stage2Selection]);

  const handleClearSavedStage2Intent = useCallback(async () => {
    setStage2Working(true);
    setStage2Selection([]);
    try {
      const res = await api.patchStrategyLabContext(auditId, { director_stage2_domains: null });
      mergeStrategyLabContextInAuditCache?.(res.strategy_lab_context);
      toast.success(STRATEGY_LAB_COPY.directorStage2Intent.clearSaved);
      onReload();
    } catch {
      toast.error(STRATEGY_LAB_COPY.directorStage2Intent.saveFailed);
    } finally {
      setStage2Working(false);
    }
  }, [auditId, mergeStrategyLabContextInAuditCache, onReload]);

  const handleSaveBoardIdentityPreference = useCallback(async () => {
    setBoardIdentityWorking(true);
    try {
      const res = await api.patchStrategyLabContext(auditId, {
        preserve_board_identity_on_rename: preserveBoardIdentityOnRename ? true : null,
      });
      mergeStrategyLabContextInAuditCache?.(res.strategy_lab_context);
      toast.success(STRATEGY_LAB_COPY.boardIdentity.saveOk);
      onReload();
    } catch {
      toast.error(STRATEGY_LAB_COPY.boardIdentity.saveFailed);
    } finally {
      setBoardIdentityWorking(false);
    }
  }, [auditId, mergeStrategyLabContextInAuditCache, onReload, preserveBoardIdentityOnRename]);

  return {
    stage2Selection,
    stage2Working,
    preserveBoardIdentityOnRename,
    boardIdentityWorking,
    setPreserveBoardIdentityOnRename,
    toggleStage2Domain,
    handleSaveStage2Intent,
    handleClearSavedStage2Intent,
    handleSaveBoardIdentityPreference,
  };
}
