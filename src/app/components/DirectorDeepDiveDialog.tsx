import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { api } from '../data/apiService';
import type { DomainKey } from '../data/auditTypes';
import { ORCHESTRATION_UI_COPY } from '../config/orchestration-roadmap-ui-copy.en';
import { APP_FEATURE_FLAGS } from '../config/app-feature-flags';
import { DIRECTOR_SUB_AGENT_OPTIONS } from '../config/director-sub-agents';
import { ApiError } from '../data/api-error';
import { DIRECTOR_DEEP_DIVE_API_ERROR_CODES } from '../config/director-deep-dive-api-error-codes';
import { useDirectorDeepDiveJob } from '../hooks/useDirectorDeepDiveJob';

function createIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

type DeepDiveStatus = 'idle' | 'queued' | 'running' | 'completed' | 'failed';
type DirectorOperatingMode = 'discovery' | 'launch' | 'growth' | 'authority' | 'defense';
type DirectorOperatingModeOption = DirectorOperatingMode | 'auto';

const DIRECTOR_OPERATING_MODE_OPTIONS: ReadonlyArray<{ id: DirectorOperatingModeOption; label: string }> = [
  { id: 'auto', label: ORCHESTRATION_UI_COPY.deepDiveModeAuto },
  { id: 'discovery', label: ORCHESTRATION_UI_COPY.deepDiveMode_discovery },
  { id: 'launch', label: ORCHESTRATION_UI_COPY.deepDiveMode_launch },
  { id: 'growth', label: ORCHESTRATION_UI_COPY.deepDiveMode_growth },
  { id: 'authority', label: ORCHESTRATION_UI_COPY.deepDiveMode_authority },
  { id: 'defense', label: ORCHESTRATION_UI_COPY.deepDiveMode_defense },
];

export function DirectorDeepDiveDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  auditId: string;
  domainKey: DomainKey;
}) {
  const { open, onOpenChange, auditId, domainKey } = props;
  const [goalsText, setGoalsText] = useState('');
  const [constraintsText, setConstraintsText] = useState('');
  const [status, setStatus] = useState<DeepDiveStatus>('idle');
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [estimatedDurationMinutes, setEstimatedDurationMinutes] = useState<number | null>(null);
  const [selectedSubAgentIds, setSelectedSubAgentIds] = useState<string[]>([]);
  const [selectedMode, setSelectedMode] = useState<DirectorOperatingModeOption>('auto');
  const { status: realtimeJobStatus, qaBlock } = useDirectorDeepDiveJob({ jobId, auditId, domainKey });
  const availableSubAgents = useMemo(
    () => DIRECTOR_SUB_AGENT_OPTIONS.filter((option) => option.domainKey === domainKey),
    [domainKey],
  );

  const goals = useMemo(
    () => goalsText.split('\n').map((v) => v.trim()).filter(Boolean),
    [goalsText],
  );
  const constraints = useMemo(
    () => constraintsText.split('\n').map((v) => v.trim()).filter(Boolean),
    [constraintsText],
  );

  function mapDeepDiveApiError(error: unknown): string {
    if (!(error instanceof ApiError) || !error.code) {
      return ORCHESTRATION_UI_COPY.deepDiveErrorFallback;
    }
    switch (error.code) {
      case DIRECTOR_DEEP_DIVE_API_ERROR_CODES.DIRECTOR_DEEP_DIVE_DISABLED:
        return ORCHESTRATION_UI_COPY.deepDiveErrorFeatureDisabled;
      case DIRECTOR_DEEP_DIVE_API_ERROR_CODES.DIRECTOR_DEEP_DIVE_PAYLOAD_INVALID:
        return ORCHESTRATION_UI_COPY.deepDiveErrorPayloadInvalid;
      case DIRECTOR_DEEP_DIVE_API_ERROR_CODES.IDEMPOTENCY_PAYLOAD_MISMATCH:
        return ORCHESTRATION_UI_COPY.deepDiveErrorIdempotencyMismatch;
      case DIRECTOR_DEEP_DIVE_API_ERROR_CODES.DIRECTOR_DEEP_DIVE_QUOTA_EXCEEDED:
        return ORCHESTRATION_UI_COPY.deepDiveErrorQuotaExceeded;
      case DIRECTOR_DEEP_DIVE_API_ERROR_CODES.DIRECTOR_DEEP_DIVE_TOKEN_BUDGET_EXCEEDED:
        return ORCHESTRATION_UI_COPY.deepDiveErrorTokenBudgetExceeded;
      case DIRECTOR_DEEP_DIVE_API_ERROR_CODES.DIRECTOR_DEEP_DIVE_JOB_NOT_FOUND:
        return ORCHESTRATION_UI_COPY.deepDiveErrorJobNotFound;
      case DIRECTOR_DEEP_DIVE_API_ERROR_CODES.DIRECTOR_DEEP_DIVE_FAILED:
        return ORCHESTRATION_UI_COPY.deepDiveErrorFailed;
      case DIRECTOR_DEEP_DIVE_API_ERROR_CODES.DIRECTOR_DEEP_DIVE_DEAD_LETTER:
        return ORCHESTRATION_UI_COPY.deepDiveErrorDeadLetter;
      default:
        return ORCHESTRATION_UI_COPY.deepDiveErrorFallback;
    }
  }

  async function startDeepDive(): Promise<void> {
    setError(null);
    if (goals.length === 0) {
      setError(ORCHESTRATION_UI_COPY.deepDiveGoalsRequired);
      return;
    }
    setStatus('queued');
    try {
      const res = await api.postDirectorDeepDive(auditId, domainKey, {
        client_context: {
          goals,
          constraints,
        },
        idempotency_key: createIdempotencyKey(),
        operating_mode: selectedMode === 'auto' ? undefined : selectedMode,
        sub_agent_ids: selectedSubAgentIds.length > 0 ? selectedSubAgentIds : undefined,
      });
      setJobId(res.job_id);
      setEstimatedDurationMinutes(res.estimated_duration_minutes);
      setStatus('running');
    } catch (e) {
      setStatus('failed');
      setError(mapDeepDiveApiError(e));
    }
  }

  useEffect(() => {
    if (realtimeJobStatus === 'completed') {
      setStatus('completed');
      return;
    }
    if (realtimeJobStatus === 'running') {
      setStatus((prev) => (prev === 'queued' || prev === 'running' ? 'running' : prev));
      return;
    }
    if (realtimeJobStatus === 'failed' || realtimeJobStatus === 'dead_letter') {
      setStatus('failed');
      setError(
        realtimeJobStatus === 'dead_letter'
          ? ORCHESTRATION_UI_COPY.deepDiveErrorDeadLetter
          : ORCHESTRATION_UI_COPY.deepDiveErrorFailed,
      );
    }
  }, [realtimeJobStatus]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{ORCHESTRATION_UI_COPY.deepDiveDialogTitle}</DialogTitle>
          <DialogDescription>{ORCHESTRATION_UI_COPY.deepDiveDialogDescription}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <label className="text-xs font-medium text-[var(--text-secondary)]">
            {ORCHESTRATION_UI_COPY.deepDiveGoalsLabel}
            <textarea
              className="mt-1 w-full rounded-md border border-[var(--border-default)] bg-[var(--surface-base)] px-3 py-2 text-sm"
              value={goalsText}
              onChange={(event) => setGoalsText(event.target.value)}
            />
          </label>
          <label className="text-xs font-medium text-[var(--text-secondary)]">
            {ORCHESTRATION_UI_COPY.deepDiveConstraintsLabel}
            <textarea
              className="mt-1 w-full rounded-md border border-[var(--border-default)] bg-[var(--surface-base)] px-3 py-2 text-sm"
              value={constraintsText}
              onChange={(event) => setConstraintsText(event.target.value)}
            />
          </label>
          <label className="text-xs font-medium text-[var(--text-secondary)]">
            {ORCHESTRATION_UI_COPY.deepDiveModeLabel}
            <select
              className="mt-1 w-full rounded-md border border-[var(--border-default)] bg-[var(--surface-base)] px-3 py-2 text-sm"
              value={selectedMode}
              onChange={(event) => setSelectedMode(event.target.value as DirectorOperatingModeOption)}
            >
              {DIRECTOR_OPERATING_MODE_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          {APP_FEATURE_FLAGS.directorSubAgentsEnabled ? (
            <div className="space-y-2">
            <div className="text-xs font-medium text-[var(--text-secondary)]">{ORCHESTRATION_UI_COPY.deepDiveAgentPickerLabel}</div>
            <p className="text-xs text-[var(--text-tertiary)]">{ORCHESTRATION_UI_COPY.deepDiveAgentPickerHint}</p>
            <div className="space-y-2">
              {availableSubAgents.map((option) => {
                const checked = selectedSubAgentIds.includes(option.id);
                return (
                  <label key={option.id} className="flex cursor-pointer items-start gap-2 rounded-md border border-[var(--border-default)] px-3 py-2">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={checked}
                      onChange={(event) => {
                        setSelectedSubAgentIds((prev) => {
                          if (event.target.checked) return [...prev, option.id];
                          return prev.filter((id) => id !== option.id);
                        });
                      }}
                    />
                    <span>
                      <span className="block text-sm text-[var(--text-primary)]">
                        {ORCHESTRATION_UI_COPY.deepDiveSubAgentLabelPrefix} · {option.title}
                      </span>
                      <span className="block text-xs text-[var(--text-tertiary)]">{option.description}</span>
                    </span>
                  </label>
                );
              })}
            </div>
            </div>
          ) : null}
          {estimatedDurationMinutes != null ? (
            <p className="text-xs text-[var(--text-tertiary)]">
              {ORCHESTRATION_UI_COPY.deepDiveEstimatedTimeLabel}: {estimatedDurationMinutes}{' '}
              {ORCHESTRATION_UI_COPY.deepDiveEstimatedTimeMinutesSuffix}
            </p>
          ) : null}
          {jobId ? <p className="text-xs text-[var(--text-tertiary)]">{ORCHESTRATION_UI_COPY.deepDiveJobPrefix}: {jobId}</p> : null}
          {status !== 'idle' ? (
            <p className="text-sm text-[var(--text-secondary)]" aria-live="polite">
              {ORCHESTRATION_UI_COPY.deepDiveStatusLabel}: {status}
            </p>
          ) : null}
          {status === 'completed' && qaBlock ? (
            <div className="space-y-2 rounded-md border border-[var(--border-default)] bg-[var(--surface-base)] px-3 py-2 text-sm text-[var(--text-secondary)]">
              <p className="font-medium text-[var(--text-primary)]">{ORCHESTRATION_UI_COPY.deepDiveQaBlockTitle}</p>
              <p>{qaBlock.coherence}</p>
              <p>{qaBlock.feasibility}</p>
              <p>
                {ORCHESTRATION_UI_COPY.deepDiveQaTop3Label}: {qaBlock.top_3_actions.join(', ')}
              </p>
              <p>
                {ORCHESTRATION_UI_COPY.deepDiveQaRisksLabel}: {qaBlock.risks.join(', ')}
              </p>
              <p>
                {ORCHESTRATION_UI_COPY.deepDiveQaMeasurementLabel}: {qaBlock.measurement.join(', ')}
              </p>
            </div>
          ) : null}
          {error ? (
            <p className="text-sm text-[var(--ui-danger-fg-strong)]" aria-live="assertive">
              {error}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {ORCHESTRATION_UI_COPY.deepDiveCloseCta}
          </Button>
          <Button type="button" onClick={() => void startDeepDive()}>
            {ORCHESTRATION_UI_COPY.deepDiveStartCta}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
