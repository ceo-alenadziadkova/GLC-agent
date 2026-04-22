import { useQuery } from '@tanstack/react-query';
import { extractDirectorDeepDiveContextFromBrief } from '@glc/intake-core';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { api } from '../data/apiService';
import type { DomainKey } from '../data/auditTypes';
import { ORCHESTRATION_UI_COPY } from '../config/orchestration-roadmap-ui-copy.en';
import { APP_FEATURE_FLAGS } from '../config/app-feature-flags';
import { DIRECTOR_SUB_AGENT_OPTIONS } from '../config/director-sub-agents';
import { ApiError } from '../data/api-error';
import { DIRECTOR_DEEP_DIVE_API_ERROR_CODES } from '../config/director-deep-dive-api-error-codes';
import { useDirectorDeepDiveJob } from '../hooks/useDirectorDeepDiveJob';
import { Textarea } from '../../design-system/ui';

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
  /** When set, overrides `APP_FEATURE_FLAGS.directorSubAgentsEnabled` (rollout gating on parent). */
  subAgentsEnabledOverride?: boolean;
}) {
  const { open, onOpenChange, auditId, domainKey, subAgentsEnabledOverride } = props;
  const subAgentsPickerEnabled = subAgentsEnabledOverride ?? APP_FEATURE_FLAGS.directorSubAgentsEnabled;
  const [goalsText, setGoalsText] = useState('');
  const [constraintsText, setConstraintsText] = useState('');
  const [timeframeDays, setTimeframeDays] = useState<number | undefined>(undefined);
  const [status, setStatus] = useState<DeepDiveStatus>('idle');
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [estimatedDurationMinutes, setEstimatedDurationMinutes] = useState<number | null>(null);
  const [selectedSubAgentIds, setSelectedSubAgentIds] = useState<string[]>([]);
  const [selectedMode, setSelectedMode] = useState<DirectorOperatingModeOption>('auto');
  const { status: realtimeJobStatus, qaBlock } = useDirectorDeepDiveJob({ jobId, auditId, domainKey });
  const prefillFromBriefRef = useRef(false);
  const briefQuery = useQuery({
    queryKey: ['directorDeepDiveBrief', auditId],
    queryFn: () => api.getBrief(auditId),
    enabled: open,
    staleTime: 60_000,
  });
  const quotaQuery = useQuery({
    queryKey: ['directorDeepDiveQuota', auditId, domainKey],
    queryFn: () => api.getDirectorDeepDiveQuota(auditId, domainKey),
    enabled: open,
    retry: false,
  });
  const availableSubAgents = useMemo(
    () => DIRECTOR_SUB_AGENT_OPTIONS.filter((option) => option.domainKey === domainKey),
    [domainKey],
  );
  const quota = quotaQuery.data;
  const quotaExhausted = Boolean(
    quotaQuery.isSuccess && quota != null && quota.remaining === 0,
  );
  const coveragePackageLabel = useMemo(() => {
    if (quota == null) return null;
    if (quota.coverage_package === 'starter') {
      return ORCHESTRATION_UI_COPY.deepDivePackageLabel_starter;
    }
    if (quota.coverage_package === 'pro') {
      return ORCHESTRATION_UI_COPY.deepDivePackageLabel_pro;
    }
    return ORCHESTRATION_UI_COPY.deepDivePackageLabel_complete;
  }, [quota]);

  const goals = useMemo(
    () => goalsText.split('\n').map((v) => v.trim()).filter(Boolean),
    [goalsText],
  );
  const constraints = useMemo(
    () => constraintsText.split('\n').map((v) => v.trim()).filter(Boolean),
    [constraintsText],
  );

  useEffect(() => {
    if (!open) {
      prefillFromBriefRef.current = false;
    }
  }, [open]);

  useEffect(() => {
    const brief = briefQuery.data?.brief;
    if (!open || prefillFromBriefRef.current || !brief?.responses) return;
    const fromBrief = extractDirectorDeepDiveContextFromBrief(
      domainKey,
      brief.responses as Record<string, unknown>,
    );
    if (fromBrief.goals.length > 0 && goalsText === '') {
      setGoalsText(fromBrief.goals.join('\n'));
    }
    if (fromBrief.constraints.length > 0 && constraintsText === '') {
      setConstraintsText(fromBrief.constraints.join('\n'));
    }
    if (fromBrief.timeframe_days != null) {
      setTimeframeDays((prev) => (prev === undefined ? fromBrief.timeframe_days : prev));
    }
    prefillFromBriefRef.current = true;
  }, [open, briefQuery.data, domainKey, goalsText, constraintsText]);

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
          ...(timeframeDays != null ? { timeframe_days: timeframeDays } : {}),
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
          {briefQuery.isSuccess &&
          briefQuery.data?.brief &&
          Object.keys(briefQuery.data.brief.responses).length > 0 ? (
            <p className="text-xs text-[var(--text-tertiary)]">{ORCHESTRATION_UI_COPY.deepDiveIntakePrefillHint}</p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            {quotaQuery.isLoading ? (
              <span className="text-xs text-[var(--text-tertiary)]">{ORCHESTRATION_UI_COPY.deepDiveQuotaLoading}</span>
            ) : null}
            {quotaQuery.isSuccess && quota ? (
              <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
                {coveragePackageLabel ? (
                  <Badge variant="outline" className="w-fit text-xs font-normal">
                    {ORCHESTRATION_UI_COPY.deepDivePackageBadgePrefix} {coveragePackageLabel}
                  </Badge>
                ) : null}
                <Badge variant="secondary" className="w-fit text-xs font-normal">
                  {ORCHESTRATION_UI_COPY.deepDiveQuotaLabel} {quota.used_count} / {quota.per_domain_limit}
                </Badge>
              </div>
            ) : null}
            {quotaExhausted ? (
              <p className="text-sm text-[var(--ui-warning-fg-strong)]" role="status">
                {ORCHESTRATION_UI_COPY.deepDiveQuotaExhaustedHint}
              </p>
            ) : null}
            {quotaQuery.isError ? (
              <span className="text-xs text-[var(--text-tertiary)]">{ORCHESTRATION_UI_COPY.deepDiveQuotaUnavailable}</span>
            ) : null}
          </div>
          <label className="text-xs font-medium text-[var(--text-secondary)]">
            {ORCHESTRATION_UI_COPY.deepDiveGoalsLabel}
            <Textarea
              className="mt-1 w-full rounded-md border border-[var(--border-default)] bg-[var(--surface-base)] px-3 py-2 text-sm"
              value={goalsText}
              onChange={(event) => setGoalsText(event.target.value)}
            />
          </label>
          <label className="text-xs font-medium text-[var(--text-secondary)]">
            {ORCHESTRATION_UI_COPY.deepDiveConstraintsLabel}
            <Textarea
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
          {subAgentsPickerEnabled ? (
            <div className="space-y-2">
            <div className="text-xs font-medium text-[var(--text-secondary)]">{ORCHESTRATION_UI_COPY.deepDiveAgentPickerLabel}</div>
            <p className="text-xs text-[var(--text-tertiary)]">{ORCHESTRATION_UI_COPY.deepDiveAgentPickerHint}</p>
            <div className="max-h-[min(50vh,24rem)] space-y-2 overflow-y-auto overscroll-contain pr-1 sm:max-h-[min(60vh,28rem)]">
              {availableSubAgents.map((option) => {
                const checked = selectedSubAgentIds.includes(option.id);
                return (
                  <label key={option.id} className="flex cursor-pointer items-start gap-2 rounded-md border border-[var(--border-default)] px-3 py-2 touch-manipulation">
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
          <Button
            type="button"
            disabled={quotaExhausted || (status !== 'idle' && status !== 'failed')}
            onClick={() => void startDeepDive()}
          >
            {ORCHESTRATION_UI_COPY.deepDiveStartCta}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
