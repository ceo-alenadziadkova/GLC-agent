import { useCallback, useEffect, useState } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { api } from '../data/apiService';
import { ApiError } from '../data/api-error';
import { STRATEGY_LAB_COPY } from '../config/strategy-lab-copy';
import { applyStrategyLabContextPatchToAuditCache } from '../lib/strategy-lab-context-cache';
import type { StrategyRoadmap } from '../data/audit/contracts/report/report-domain.types';

export type UseStrategyConstraintsResult = {
  constraintStageDraft: string;
  constraintBudgetDraft: string;
  constraintTeamDraft: string;
  constraintSaving: boolean;
  constraintOverridesSaveErrorMessage: string | null;
  setConstraintStageDraft: (v: string) => void;
  setConstraintBudgetDraft: (v: string) => void;
  setConstraintTeamDraft: (v: string) => void;
  dismissConstraintOverridesSaveError: () => void;
  handleSaveConstraintOverrides: () => Promise<void>;
  handleClearConstraintOverrides: () => Promise<void>;
};

function formatConstraintOverridesSaveErrorMessage(e: unknown): string {
  const base = STRATEGY_LAB_COPY.constraints.saveFailed;
  if (!(e instanceof ApiError)) return base;
  const detail =
    e.details && typeof e.details === 'object' && e.details !== null && 'detail' in e.details
      ? String((e.details as { detail?: unknown }).detail ?? '')
      : '';
  return detail.trim() ? `${base} (${detail})` : base;
}

/**
 * Consultant-only constraint overrides (stage / budget / team) for Strategy Lab.
 * Persists via `patchStrategyLabContext` and merges optimistic updates into the audit cache.
 */
export function useStrategyConstraints(args: {
  auditId: string | undefined;
  strategy: StrategyRoadmap | null | undefined;
  isClient: boolean;
  queryClient: QueryClient;
  reload: () => void;
}): UseStrategyConstraintsResult {
  const { auditId, strategy, isClient, queryClient, reload } = args;

  const [constraintStageDraft, setConstraintStageDraft] = useState<string>('growth');
  const [constraintBudgetDraft, setConstraintBudgetDraft] = useState<string>('unknown');
  const [constraintTeamDraft, setConstraintTeamDraft] = useState<string>('unknown');
  const [constraintSaving, setConstraintSaving] = useState(false);
  const [constraintOverridesSaveErrorMessage, setConstraintOverridesSaveErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!strategy || isClient) return;
    const ec = strategy.effective_constraints;
    if (ec && typeof ec.company_stage === 'string') {
      setConstraintStageDraft(ec.company_stage);
      setConstraintBudgetDraft(ec.budget_band);
      setConstraintTeamDraft(ec.team_scale);
      return;
    }
    setConstraintStageDraft('growth');
    setConstraintBudgetDraft('unknown');
    setConstraintTeamDraft('unknown');
  }, [strategy, isClient]);

  const dismissConstraintOverridesSaveError = useCallback(() => {
    setConstraintOverridesSaveErrorMessage(null);
  }, []);

  const handleSaveConstraintOverrides = useCallback(async () => {
    if (!auditId) return;
    setConstraintSaving(true);
    try {
      const res = await api.patchStrategyLabContext(auditId, {
        company_stage: constraintStageDraft,
        budget_band: constraintBudgetDraft,
        team_scale: constraintTeamDraft,
      });
      setConstraintOverridesSaveErrorMessage(null);
      applyStrategyLabContextPatchToAuditCache(queryClient, auditId, res.strategy_lab_context);
      toast.success(STRATEGY_LAB_COPY.constraints.saveOk);
      reload();
    } catch (e) {
      const msg = formatConstraintOverridesSaveErrorMessage(e);
      setConstraintOverridesSaveErrorMessage(msg);
      toast.error(msg);
    } finally {
      setConstraintSaving(false);
    }
  }, [auditId, constraintStageDraft, constraintBudgetDraft, constraintTeamDraft, queryClient, reload]);

  const handleClearConstraintOverrides = useCallback(async () => {
    if (!auditId) return;
    setConstraintSaving(true);
    try {
      const res = await api.patchStrategyLabContext(auditId, {
        company_stage: null,
        budget_band: null,
        team_scale: null,
      });
      setConstraintOverridesSaveErrorMessage(null);
      applyStrategyLabContextPatchToAuditCache(queryClient, auditId, res.strategy_lab_context);
      toast.success(STRATEGY_LAB_COPY.constraints.clearOk);
      reload();
    } catch (e) {
      const msg = formatConstraintOverridesSaveErrorMessage(e);
      setConstraintOverridesSaveErrorMessage(msg);
      toast.error(msg);
    } finally {
      setConstraintSaving(false);
    }
  }, [auditId, queryClient, reload]);

  return {
    constraintStageDraft,
    constraintBudgetDraft,
    constraintTeamDraft,
    constraintSaving,
    constraintOverridesSaveErrorMessage,
    setConstraintStageDraft,
    setConstraintBudgetDraft,
    setConstraintTeamDraft,
    dismissConstraintOverridesSaveError,
    handleSaveConstraintOverrides,
    handleClearConstraintOverrides,
  };
}
