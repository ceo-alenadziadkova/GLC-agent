import { useCallback, useState } from 'react';

import type { PipelineMonitorCopy } from '../../../../config/pipeline-monitor-copy';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../../components/ui/dialog';
import { Button } from '../../../../components/ui/button';
import { Checkbox } from '../../../../components/ui/checkbox';
import { Label } from '../../../../components/ui/label';
import { api } from '../../../../data/apiService';
import { invalidateAuditRelatedQueries } from '../../../../lib/glc-invalidate-queries';
import { getGlcQueryClient } from '../../../../lib/glc-query-client';
import { toUiApiErrorMessage } from '../../../../lib/api-error-ui';

export type StrategyRepairedJsonApplyCopy = PipelineMonitorCopy['detail']['strategyRepairedJsonApply'];

/**
 * Consultants often paste the full `llm_tool_validation_failed` event row: unwrap `raw_tool_input_json`
 * when it is a JSON string (same shape as Claude tool input).
 */
function coercePastedJsonToStrategyToolInput(parsed: unknown): unknown {
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return parsed;
  const raw = (parsed as Record<string, unknown>).raw_tool_input_json;
  if (typeof raw === 'string' && raw.trim()) {
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      return parsed;
    }
  }
  return parsed;
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  auditId: string;
  strategyRepairedApplyCopy: StrategyRepairedJsonApplyCopy;
  onApplied: () => Promise<void>;
};

export function StrategyRepairedJsonApplyDialog(props: Props) {
  const { open, onOpenChange, auditId, strategyRepairedApplyCopy, onApplied } = props;

  const [jsonText, setJsonText] = useState('');
  const [forceOverwrite, setForceOverwrite] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const copy = strategyRepairedApplyCopy;

  const handleClose = useCallback(
    (next: boolean) => {
      if (busy && !next) return;
      onOpenChange(next);
      if (!next) {
        setLocalError(null);
      }
    },
    [busy, onOpenChange],
  );

  const handleSubmit = useCallback(async () => {
    if (busy) return;
    setLocalError(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText.trim());
    } catch {
      setLocalError(copy.parseError);
      return;
    }
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      setLocalError(copy.parseError);
      return;
    }

    const strategyToolInput = coercePastedJsonToStrategyToolInput(parsed);
    if (
      strategyToolInput === null
      || typeof strategyToolInput !== 'object'
      || Array.isArray(strategyToolInput)
    ) {
      setLocalError(copy.parseError);
      return;
    }

    setBusy(true);
    try {
      await api.postPlatformStrategyRepairedJsonApply(auditId, {
        strategy_tool_input: strategyToolInput,
        ...(forceOverwrite ? { force_replace_completed_audit: true } : {}),
      });
      invalidateAuditRelatedQueries(getGlcQueryClient(), auditId);
      await onApplied();
      setJsonText('');
      setForceOverwrite(false);
      onOpenChange(false);
    } catch (err) {
      setLocalError(toUiApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }, [auditId, busy, copy.parseError, forceOverwrite, jsonText, onApplied, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[min(720px,calc(100vh-4rem))] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{copy.dialogTitle}</DialogTitle>
          <DialogDescription className="text-left">{copy.dialogIntro}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-muted-foreground text-xs" htmlFor="strategy-repaired-json-textarea">
              {copy.jsonLabel}
            </Label>
            <textarea
              id="strategy-repaired-json-textarea"
              className="w-full min-h-[220px] rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 font-mono text-xs"
              spellCheck={false}
              placeholder={copy.jsonPlaceholder}
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              disabled={busy}
              autoComplete="off"
            />
          </div>
          <div className="flex items-start gap-2">
            <Checkbox
              id="strategy-repaired-json-force"
              checked={forceOverwrite}
              onCheckedChange={(v) => setForceOverwrite(v === true)}
              disabled={busy}
            />
            <label htmlFor="strategy-repaired-json-force" className="text-muted-foreground cursor-pointer select-none text-sm leading-snug">
              {copy.forceLabel}
            </label>
          </div>
          {localError ? (
            <p className="text-[var(--score-1)] text-xs leading-relaxed" role="alert">
              {localError}
            </p>
          ) : null}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => handleClose(false)} disabled={busy}>
            {copy.cancel}
          </Button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={busy || jsonText.trim().length === 0}>
            {busy ? copy.busy : copy.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
