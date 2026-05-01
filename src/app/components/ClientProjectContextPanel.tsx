import { ArrowsClockwise, CheckCircle, Spinner } from '@phosphor-icons/react';
import { useMemo } from 'react';
import { WORKSPACE_PAGE_COPY } from '../config/workspace-page-copy';
import { APP_FEATURE_FLAGS } from '../config/app-feature-flags';
import { useClientProjectContext } from '../hooks/useClientProjectContext';
import {
  clientIndustryLabelFromStep0,
  siteIndustryDisputesClientBasics,
} from '../lib/client-industry-compare';

const copy = WORKSPACE_PAGE_COPY.newAudit.step1.clientProjectContext;

type LighthouseSlice = {
  performance_score?: number | null;
  seo_score?: number | null;
  accessibility_score?: number | null;
  best_practices_score?: number | null;
  error?: string;
};

function formatLighthouseHuman(
  line: LighthouseSlice | undefined,
  o: {
    max: string;
    perf: string;
    seo: string;
    a11y: string;
  },
): string | null {
  if (!line) return null;
  if (line.error) {
    return line.error;
  }
  const parts: string[] = [];
  if (line.performance_score != null) {
    parts.push(`${o.perf}: ${line.performance_score}/${o.max}`);
  }
  if (line.seo_score != null) {
    parts.push(`${o.seo}: ${line.seo_score}/${o.max}`);
  }
  if (line.accessibility_score != null) {
    parts.push(`${o.a11y}: ${line.accessibility_score}/${o.max}`);
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}

export type ClientProjectContextPanelVariant = 'default' | 'site_check';

export function ClientProjectContextPanel(props: {
  auditId: string | null;
  /** Fingerprint of local brief; debounced in the hook. */
  briefSyncKey: string;
  /** When set, polls the server on this interval (new-audit site check). */
  refetchIntervalMs?: number;
  /** Friendlier title/subtitle on the new-audit “site check” step. */
  variant?: ClientProjectContextPanelVariant;
  /**
   * Industry from New Audit step 0. If set, we do not show `industry_guess` unless it disagrees
   * with what the user picked (then we show a short conflict line only).
   */
  clientStep0Basics?: { industry: string; industrySpecify?: string };
}) {
  const variant = props.variant ?? 'default';
  const panelEnabled = APP_FEATURE_FLAGS.newAuditClientProjectContextPanelEnabled;
  const { state, refetch } = useClientProjectContext({
    auditId: props.auditId,
    enabled: panelEnabled && props.auditId != null,
    briefSyncKey: props.briefSyncKey,
    refetchIntervalMs: props.refetchIntervalMs,
  });

  const mergedByKey = useMemo(() => {
    if (state.status !== 'ready') {
      return undefined;
    }
    return {
      ...(state.precheck?.byKey ?? {}),
      ...(state.context?.auditEnrichment?.byKey ?? {}),
    };
  }, [state]);

  const isRefreshing = state.status === 'ready' && Boolean(state.isRefreshing);

  const rawLh = mergedByKey?.performance_lighthouse as LighthouseSlice | undefined;

  const lighthouseLine = useMemo(() => {
    return formatLighthouseHuman(rawLh, {
      max: copy.lighthouseMaxScore,
      perf: copy.lighthousePerf,
      seo: copy.lighthouseSeo,
      a11y: copy.lighthouseA11y,
    });
  }, [rawLh]);

  const lighthouseFailed = Boolean(rawLh && typeof rawLh.error === 'string' && rawLh.error.length > 0);

  const siteScrapeLine = useMemo(() => {
    if (!mergedByKey) {
      return null;
    }
    const s = mergedByKey.site_scrape as
      | {
          status?: string;
          short_label?: string | null;
          industry_guess?: string | null;
          overall_score?: number | null;
          degraded?: boolean;
        }
      | undefined;
    if (!s || s.status !== 'ready') {
      return null;
    }
    const lines: string[] = [];
    if (s.short_label) {
      lines.push(`${copy.siteScrapeTypePrefix} ${s.short_label}`);
    }
    const basics = props.clientStep0Basics;
    if (
      basics != null &&
      s.industry_guess != null &&
      siteIndustryDisputesClientBasics(s.industry_guess, basics.industry, basics.industrySpecify)
    ) {
      const yours = clientIndustryLabelFromStep0(basics.industry, basics.industrySpecify);
      const suggested = String(s.industry_guess).trim();
      lines.push(
        copy.siteScrapeIndustryConflict
          .replace('{{suggested}}', suggested)
          .replace('{{yours}}', yours),
      );
    }
    if (s.overall_score != null) {
      lines.push(`${copy.siteScrapeScorePrefix} ${s.overall_score}/${copy.lighthouseMaxScore}`);
    }
    if (s.degraded) {
      lines.push(copy.siteScrapeLimitedNote);
    }
    return lines.length > 0 ? lines.join('\n') : null;
  }, [mergedByKey, props.clientStep0Basics]);

  const siteScrapeReady = useMemo(() => {
    const s = mergedByKey?.site_scrape as { status?: string } | undefined;
    return s?.status === 'ready';
  }, [mergedByKey]);

  const hasPrecheckSignals =
    mergedByKey &&
    (mergedByKey.performance_lighthouse != null ||
      mergedByKey.site_scrape != null ||
      (Array.isArray(mergedByKey.collector_keys_present) && mergedByKey.collector_keys_present.length > 0));

  const firstPassComplete = Boolean(
    siteScrapeReady && rawLh && !lighthouseFailed && lighthouseLine,
  );

  const hasAnyClientUsefulLine = Boolean(lighthouseLine || siteScrapeLine);

  const readinessBanner = useMemo(() => {
    if (state.status !== 'ready') {
      return null;
    }
    if (firstPassComplete) {
      return { intent: 'complete' as const, text: copy.readinessComplete };
    }
    if (hasAnyClientUsefulLine) {
      return { intent: 'partial' as const, text: copy.readinessPartial };
    }
    if (variant === 'site_check' && hasPrecheckSignals && !hasAnyClientUsefulLine) {
      return { intent: 'waiting' as const, text: copy.readinessNoneYet };
    }
    return null;
  }, [state.status, firstPassComplete, hasAnyClientUsefulLine, hasPrecheckSignals, variant]);

  const panelTitle = variant === 'site_check' ? copy.titleSiteCheck : copy.title;
  const panelSubtitle = variant === 'site_check' ? copy.subtitleSiteCheck : copy.subtitle;
  const loadingLine = variant === 'site_check' && copy.loadingSiteCheck ? copy.loadingSiteCheck : copy.loading;
  const lighthouseHeading = variant === 'site_check' ? copy.lighthouseLabelPlain : copy.lighthouseLabel;

  if (!panelEnabled) {
    return null;
  }

  if (props.auditId == null) {
    return null;
  }

  return (
    <div className="border-border/60 bg-muted/15 mb-4 rounded-xl border p-3 sm:p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-foreground m-0 text-sm font-semibold">{panelTitle}</h3>
          <p className="text-muted-foreground m-0 mt-0.5 text-xs leading-relaxed">{panelSubtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 rounded-md p-1.5 text-xs"
          aria-label={copy.refreshAria}
        >
          <ArrowsClockwise className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>

      {readinessBanner && (
        <div
          className={
            readinessBanner.intent === 'complete'
              ? 'mt-3 flex gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-foreground'
              : 'mt-3 flex gap-2 rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-xs text-foreground/90'
          }
        >
          {readinessBanner.intent === 'complete' && (
            <CheckCircle className="h-4 w-4 flex-shrink-0 text-emerald-600 dark:text-emerald-400" weight="fill" aria-hidden />
          )}
          {readinessBanner.intent === 'complete' ? (
            <p className="m-0 leading-relaxed">{readinessBanner.text}</p>
          ) : (
            <p className="text-muted-foreground m-0 leading-relaxed">{readinessBanner.text}</p>
          )}
        </div>
      )}

      <div className="mt-3 min-h-[2.5rem]">
        {state.status === 'loading' && (
          <div className="text-muted-foreground flex items-center gap-2 text-xs">
            <Spinner className="h-4 w-4 animate-spin" aria-hidden />
            {loadingLine}
          </div>
        )}

        {state.status === 'error' && (
          <p className="text-destructive m-0 text-xs leading-relaxed">
            {copy.errorPrefix}
            {state.message ? ` ${state.message}` : ''}
          </p>
        )}

        {state.status === 'ready' && state.context === null && !hasPrecheckSignals && (
          <p className="text-muted-foreground m-0 text-xs leading-relaxed">
            {variant === 'site_check' ? copy.readinessNoneYet : copy.empty}
          </p>
        )}

        {state.status === 'ready' && (state.context != null || hasPrecheckSignals) && (
          <div className="space-y-2 text-xs leading-relaxed">
            {lighthouseLine && (
              <div>
                <p className="text-muted-foreground m-0 font-medium uppercase tracking-wide">{lighthouseHeading}</p>
                <p className="text-foreground m-0 mt-0.5 whitespace-pre-line">{lighthouseLine}</p>
              </div>
            )}
            {siteScrapeLine && (
              <div>
                <p className="text-muted-foreground m-0 font-medium uppercase tracking-wide">{copy.siteScrapeLabel}</p>
                <p className="text-foreground m-0 mt-0.5 whitespace-pre-line">{siteScrapeLine}</p>
              </div>
            )}
            {state.context?.projectNarrative?.text && (
              <div>
                <p className="text-muted-foreground m-0 font-medium uppercase tracking-wide">{copy.narrativeLabel}</p>
                <p className="text-foreground m-0 mt-0.5 whitespace-pre-wrap">{state.context.projectNarrative.text}</p>
              </div>
            )}
            {state.context != null && (
              <p className="text-muted-foreground m-0 border-border/50 border-t pt-2 text-[0.7rem]">
                {copy.updatedPrefix}{' '}
                {new Date(state.context.updatedAt).toLocaleString(undefined, {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })}
              </p>
            )}
          </div>
        )}

        {isRefreshing && state.status === 'ready' && (
          <div
            className="text-muted-foreground mt-3 flex items-center gap-2 border-t border-border/40 pt-3 text-xs"
            aria-live="polite"
          >
            <Spinner className="h-3.5 w-3.5 shrink-0 animate-spin opacity-80" aria-hidden />
            {copy.refreshingInline}
          </div>
        )}
      </div>
    </div>
  );
}
