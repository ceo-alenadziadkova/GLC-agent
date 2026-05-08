import { useMemo, useState } from 'react';
import { ArrowsClockwise, Coins } from '@phosphor-icons/react';
import { Callout } from '../../../../design-system/ui';
import { Button } from '../../../components/ui/button';
import { PIPELINE_MONITOR_COPY as PM } from '../../../config/pipeline-monitor-copy';
import { PIPELINE_API_ERROR_CODES } from '../../../config/pipeline-api-error-codes';
import { PIPELINE_MONITOR_UI_POLICY } from '../config/pipeline-monitor-ui-policy';
import { api } from '../../../data/apiService';
import { formatAppInteger } from '../../../lib/number-format';
import type { PipelineErrorExtras } from '../../../hooks/usePipeline';
import type { PipelineStateLite } from '../types-pipeline-state';

type Props = {
  auditId: string | undefined;
  pipelineState: PipelineStateLite | null;
  pipelineErrorExtras: PipelineErrorExtras | null;
  canManagePlatformSettings: boolean;
  isClient: boolean;
  /** Reload pipeline + audit state after a successful top-up so the footer refreshes. */
  onTopupSuccess: () => void | Promise<void>;
};

type SubmitState =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'error'; message: string }
  | { kind: 'success'; deltaTokens: number };

const TOKEN_BUDGET_POLICY = PIPELINE_MONITOR_UI_POLICY.tokenBudgetTopup;

function shouldShowBanner(args: {
  canManagePlatformSettings: boolean;
  isClient: boolean;
  pipelineState: PipelineStateLite | null;
  pipelineErrorExtras: PipelineErrorExtras | null;
}): { show: boolean; exhausted: boolean } {
  if (args.isClient || !args.canManagePlatformSettings) {
    return { show: false, exhausted: false };
  }
  const exhaustedByError =
    args.pipelineErrorExtras?.code === PIPELINE_API_ERROR_CODES.TOKEN_BUDGET_EXCEEDED;
  if (!args.pipelineState) {
    return { show: exhaustedByError, exhausted: exhaustedByError };
  }
  const { tokens_used, token_budget } = args.pipelineState;
  if (token_budget <= 0) {
    return { show: exhaustedByError, exhausted: exhaustedByError };
  }
  const usedPct = (tokens_used / token_budget) * 100;
  const remainingPct = Math.max(0, 100 - usedPct);
  const lowThresholdHit = remainingPct <= TOKEN_BUDGET_POLICY.lowPct;
  const exhausted = exhaustedByError || tokens_used >= token_budget;
  return {
    show: exhausted || lowThresholdHit,
    exhausted,
  };
}

function fillTemplate(template: string, vars: Record<string, string | number>): string {
  return Object.entries(vars).reduce(
    (acc, [key, value]) => acc.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value)),
    template,
  );
}

export function AdminTokenBudgetTopupBanner(props: Props) {
  const { auditId, pipelineState, pipelineErrorExtras, canManagePlatformSettings, isClient, onTopupSuccess } = props;
  const copy = PM.adminTokenBudgetTopup;
  const [customAmount, setCustomAmount] = useState('');
  const [reason, setReason] = useState('');
  const [submitState, setSubmitState] = useState<SubmitState>({ kind: 'idle' });

  const visibility = useMemo(
    () => shouldShowBanner({ canManagePlatformSettings, isClient, pipelineState, pipelineErrorExtras }),
    [canManagePlatformSettings, isClient, pipelineState, pipelineErrorExtras],
  );

  if (!visibility.show || !auditId) return null;

  const tokensUsed = pipelineState?.tokens_used ?? 0;
  const tokenBudget = pipelineState?.token_budget ?? 0;
  const tokensRemaining = Math.max(0, tokenBudget - tokensUsed);
  const remainingPct = tokenBudget > 0 ? Math.max(0, Math.round((tokensRemaining / tokenBudget) * 100)) : 0;

  const intent = visibility.exhausted ? 'danger' : 'warning';
  const title = visibility.exhausted ? copy.exhaustedTitle : copy.lowTitle;
  const body = visibility.exhausted
    ? copy.exhaustedBody
    : fillTemplate(copy.lowBody, {
        remaining: formatAppInteger(tokensRemaining),
        budget: formatAppInteger(tokenBudget),
        remainingPct,
      });

  const submitting = submitState.kind === 'submitting';

  async function submitTopup(deltaTokens: number) {
    if (submitting) return;
    if (
      !Number.isInteger(deltaTokens) ||
      deltaTokens < TOKEN_BUDGET_POLICY.minDelta ||
      deltaTokens > TOKEN_BUDGET_POLICY.maxDelta
    ) {
      setSubmitState({
        kind: 'error',
        message: fillTemplate(copy.validationDeltaInvalid, {
          min: formatAppInteger(TOKEN_BUDGET_POLICY.minDelta),
          max: formatAppInteger(TOKEN_BUDGET_POLICY.maxDelta),
        }),
      });
      return;
    }
    const trimmedReason = reason.trim();
    if (trimmedReason.length > TOKEN_BUDGET_POLICY.reasonMaxLength) {
      setSubmitState({
        kind: 'error',
        message: fillTemplate(copy.validationReasonTooLong, { max: TOKEN_BUDGET_POLICY.reasonMaxLength }),
      });
      return;
    }
    setSubmitState({ kind: 'submitting' });
    try {
      await api.patchAuditTokenBudget(auditId!, {
        delta_tokens: deltaTokens,
        ...(trimmedReason.length > 0 ? { reason: trimmedReason } : {}),
      });
      setSubmitState({ kind: 'success', deltaTokens });
      setCustomAmount('');
      setReason('');
      await onTopupSuccess();
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : copy.errorGeneric;
      setSubmitState({ kind: 'error', message });
    }
  }

  function handleCustomSubmit() {
    const parsed = Number.parseInt(customAmount.replace(/[^0-9]/g, ''), 10);
    if (!Number.isFinite(parsed)) {
      setSubmitState({
        kind: 'error',
        message: fillTemplate(copy.validationDeltaInvalid, {
          min: formatAppInteger(TOKEN_BUDGET_POLICY.minDelta),
          max: formatAppInteger(TOKEN_BUDGET_POLICY.maxDelta),
        }),
      });
      return;
    }
    void submitTopup(parsed);
  }

  return (
    <Callout intent={intent} className="mb-4 p-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-2">
          <Coins className="text-[var(--text-primary)] mt-0.5 h-4 w-4 shrink-0" weight="duotone" aria-hidden />
          <div className="min-w-0">
            <p className="text-[var(--text-primary)] text-sm font-semibold">{title}</p>
            <p className="text-[var(--text-secondary)] mt-1 text-xs leading-relaxed">{body}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {TOKEN_BUDGET_POLICY.presets.map((preset) => (
            <Button
              key={preset}
              type="button"
              size="sm"
              variant="outline"
              disabled={submitting}
              onClick={() => void submitTopup(preset)}
            >
              {fillTemplate(copy.presetButtonLabel, { amount: formatAppInteger(preset) })}
            </Button>
          ))}
        </div>

        <div className="grid gap-2 md:grid-cols-2">
          <div className="space-y-1">
            <label
              className="text-[var(--text-secondary)] block text-xs"
              htmlFor="admin-token-topup-custom-amount"
            >
              {copy.customAmountLabel}
            </label>
            <input
              id="admin-token-topup-custom-amount"
              inputMode="numeric"
              autoComplete="off"
              className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-sm"
              value={customAmount}
              onChange={(event) => setCustomAmount(event.target.value)}
              placeholder={copy.customAmountPlaceholder}
              disabled={submitting}
              maxLength={12}
            />
          </div>
          <div className="space-y-1">
            <label
              className="text-[var(--text-secondary)] block text-xs"
              htmlFor="admin-token-topup-reason"
            >
              {fillTemplate(copy.reasonLabel, { max: TOKEN_BUDGET_POLICY.reasonMaxLength })}
            </label>
            <input
              id="admin-token-topup-reason"
              type="text"
              autoComplete="off"
              className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-sm"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={copy.reasonPlaceholder}
              disabled={submitting}
              maxLength={TOKEN_BUDGET_POLICY.reasonMaxLength}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            disabled={submitting || customAmount.trim().length === 0}
            onClick={handleCustomSubmit}
          >
            {submitting ? (
              <>
                <ArrowsClockwise className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                {copy.submitting}
              </>
            ) : (
              copy.submit
            )}
          </Button>
        </div>

        {submitState.kind === 'error' ? (
          <p className="text-[var(--score-1)] text-xs">{submitState.message}</p>
        ) : null}
        {submitState.kind === 'success' ? (
          <p className="text-[var(--score-5)] text-xs">
            {fillTemplate(copy.success, { amount: formatAppInteger(submitState.deltaTokens) })}
          </p>
        ) : null}
      </div>
    </Callout>
  );
}
