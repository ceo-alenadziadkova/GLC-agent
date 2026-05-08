import { ArrowsClockwise, MapTrifold } from '@phosphor-icons/react';
import { AppShell } from '../../components/AppShell';
import { Button } from '../../components/ui/button';
import { STRATEGY_LAB_COPY } from '../../config/strategy-lab-copy';

type StrategyLabLoadingShellProps = {
  title: string;
  subtitle: string;
  /** When true, skip {@link AppShell} (embedded under `/plan` unified workspace). */
  embedded?: boolean;
};

/** Consultant Strategy Lab: loading placeholder inside AppShell. */
export function StrategyLabLoadingShell({ title, subtitle, embedded = false }: StrategyLabLoadingShellProps) {
  const body = (
    <div className="flex h-64 items-center justify-center">
      <ArrowsClockwise className="text-info h-6 w-6 animate-spin" />
    </div>
  );
  if (embedded) return body;
  return (
    <AppShell title={title} subtitle={subtitle}>
      {body}
    </AppShell>
  );
}

type StrategyLabErrorShellProps = {
  title: string;
  subtitle: string;
  errorMessage: string | null;
  online: boolean;
  isFetching: boolean;
  onRetry: () => void;
  loadErrorSummaryId: string;
  loadOfflineHintId: string;
  embedded?: boolean;
};

/** Consultant Strategy Lab: audit load failure (with optional offline hint). */
export function StrategyLabErrorShell({
  title,
  subtitle,
  errorMessage,
  online,
  isFetching,
  onRetry,
  loadErrorSummaryId,
  loadOfflineHintId,
  embedded = false,
}: StrategyLabErrorShellProps) {
  const loadErrorDescribedBy = [loadErrorSummaryId, !online ? loadOfflineHintId : ''].filter(Boolean).join(' ');
  const body = (
    <div
      className="flex h-64 flex-col items-center justify-center gap-3 px-4 text-center"
      role="alert"
      aria-live="polite"
      aria-atomic="true"
    >
      <p id={loadErrorSummaryId} className="text-destructive max-w-prose">
        {errorMessage || STRATEGY_LAB_COPY.messages.auditNotFound}
      </p>
      {!online ? (
        <p id={loadOfflineHintId} className="text-muted-foreground max-w-prose text-sm">
          {STRATEGY_LAB_COPY.messages.offlineHint}
        </p>
      ) : null}
      <Button
        type="button"
        variant="secondary"
        onClick={onRetry}
        disabled={!online || isFetching}
        aria-busy={isFetching}
        aria-describedby={loadErrorDescribedBy}
      >
        {isFetching ? (
          <ArrowsClockwise className="text-info mr-2 h-4 w-4 shrink-0 animate-spin" aria-hidden />
        ) : null}
        {STRATEGY_LAB_COPY.messages.retryLoad}
      </Button>
    </div>
  );
  if (embedded) return body;
  return (
    <AppShell title={title} subtitle={subtitle}>
      {body}
    </AppShell>
  );
}

type StrategyLabNoStrategyShellProps = {
  title: string;
  subtitle: string;
  embedded?: boolean;
};

/** Strategy roadmap not yet generated for this audit. */
export function StrategyLabNoStrategyShell({ title, subtitle, embedded = false }: StrategyLabNoStrategyShellProps) {
  const body = (
    <div className="flex h-64 items-center justify-center">
      <div className="text-center">
        <MapTrifold className="text-muted-foreground mx-auto mb-3 h-10 w-10" />
        <p className="text-muted-foreground text-sm">{STRATEGY_LAB_COPY.messages.notGenerated}</p>
        <p className="text-muted-foreground mt-1 text-xs">{STRATEGY_LAB_COPY.messages.completePipeline}</p>
      </div>
    </div>
  );
  if (embedded) return body;
  return (
    <AppShell title={title} subtitle={subtitle}>
      {body}
    </AppShell>
  );
}
