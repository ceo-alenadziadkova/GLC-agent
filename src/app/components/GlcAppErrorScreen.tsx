import { useState, useCallback, useMemo } from 'react';
import { ArrowsClockwise, Copy, PaperPlaneTilt, House } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { formatClientEnvironmentForSupport } from '../lib/client-environment';
import { isLikelyTranslationOrExtensionDomCrash } from '../lib/browser-dom-crash-heuristics';
import { api } from '../data/apiService';
import { GLC_APP_ERROR_COPY_EN } from '../config/translation-safety-copy.en';
import { Button } from './ui/button';

export type GlcAppErrorScreenProps = {
  /** Stable id users can share with support (also logged server-side when reporting). */
  supportRef: string;
  /** Shown in console / server only; never rendered as primary copy. */
  technicalDetail?: string;
  onRetry?: () => void;
  homeHref: string;
  homeLabel: string;
  /** When set, a short router-specific title (optional). */
  title?: string;
};

function buildSupportPayload(
  supportRef: string,
  path: string,
  technicalDetail?: string,
): string {
  const lines = [
    GLC_APP_ERROR_COPY_EN.supportPayloadTitle,
    `${GLC_APP_ERROR_COPY_EN.supportPayloadReferenceLabel}: ${supportRef}`,
    `${GLC_APP_ERROR_COPY_EN.supportPayloadPageLabel}: ${path}`,
    `${GLC_APP_ERROR_COPY_EN.supportPayloadTimeLabel}: ${new Date().toISOString()}`,
    formatClientEnvironmentForSupport(),
  ];
  if (technicalDetail) {
    lines.push(`${GLC_APP_ERROR_COPY_EN.supportPayloadDetailLabel}: ${technicalDetail.slice(0, 1200)}`);
  }
  return lines.join('\n');
}

/**
 * Neutral, user-safe full-screen error UI. Does not expose raw stack traces or DOM exceptions.
 */
export function GlcAppErrorScreen({
  supportRef,
  technicalDetail,
  onRetry,
  homeHref,
  homeLabel,
  title = GLC_APP_ERROR_COPY_EN.defaultTitle,
}: GlcAppErrorScreenProps) {
  const [reportSent, setReportSent] = useState(false);
  const [reportBusy, setReportBusy] = useState(false);

  const likelyDomRewrite = useMemo(
    () => isLikelyTranslationOrExtensionDomCrash(technicalDetail),
    [technicalDetail],
  );

  const path = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '';

  const copyDetails = useCallback(async () => {
    const text = buildSupportPayload(supportRef, path, technicalDetail);
    try {
      await navigator.clipboard.writeText(text);
      toast.success(GLC_APP_ERROR_COPY_EN.toasts.copySuccess);
    } catch {
      toast.error(GLC_APP_ERROR_COPY_EN.toasts.copyFailure);
    }
  }, [supportRef, path, technicalDetail]);

  const sendReport = useCallback(async () => {
    setReportBusy(true);
    try {
      const ok = await api.reportUiIncident({
        ref: supportRef,
        path,
        kind: 'spa_error_screen',
        detail: technicalDetail,
      });
      if (ok) {
        setReportSent(true);
        toast.success(GLC_APP_ERROR_COPY_EN.toasts.reportSent);
      } else {
        toast.message(GLC_APP_ERROR_COPY_EN.toasts.reportFailedTitle, {
          description: GLC_APP_ERROR_COPY_EN.toasts.reportFailedDescription,
        });
      }
    } finally {
      setReportBusy(false);
    }
  }, [supportRef, path, technicalDetail]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-surface)] px-6 py-12">
      <div className="w-full max-w-md text-center">
        <div
          className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--callout-info-border)] bg-[var(--callout-info-bg)]"
        >
          <ArrowsClockwise className="h-6 w-6 text-[var(--glc-blue)]" />
        </div>
        <h1 className="mb-2 font-semibold [font-family:var(--font-display)] text-[length:var(--text-xl)] tracking-[var(--tracking-tight)] text-[var(--text-primary)]">
          {likelyDomRewrite ? GLC_APP_ERROR_COPY_EN.domRewrite.title : title}
        </h1>
        <p className="mb-4 text-sm leading-relaxed text-[var(--text-secondary)]">
          {likelyDomRewrite
            ? GLC_APP_ERROR_COPY_EN.domRewrite.description
            : GLC_APP_ERROR_COPY_EN.generic.description}
        </p>
        {likelyDomRewrite ? (
          <div
            className="mx-auto mb-4 max-w-sm rounded-xl border border-[var(--callout-warning-border)] bg-[var(--callout-warning-bg)] px-4 py-3 text-left text-sm leading-relaxed text-[var(--callout-warning-fg)]"
          >
            <p className="m-0 mb-2 font-semibold text-[var(--callout-warning-fg-emphasis)]">
              {GLC_APP_ERROR_COPY_EN.domRewrite.actionsTitle}
            </p>
            <ol className="m-0 space-y-1.5 pl-4 text-xs text-[var(--callout-warning-fg)]">
              {GLC_APP_ERROR_COPY_EN.domRewrite.actions.map((action) => (
                <li key={action}>{action}</li>
              ))}
            </ol>
          </div>
        ) : null}
        {!likelyDomRewrite ? (
          <p className="mx-auto mb-4 max-w-sm rounded-lg border border-[var(--callout-info-border)] bg-[var(--callout-info-bg)] px-3 py-2.5 text-xs leading-relaxed text-[var(--text-secondary)]">
            {GLC_APP_ERROR_COPY_EN.generic.translationHint}
          </p>
        ) : null}
        <p className="mb-6 inline-block rounded-lg bg-[var(--bg-inset)] px-3 py-2 font-mono text-xs text-[var(--text-tertiary)]">
          {GLC_APP_ERROR_COPY_EN.labels.reference}:&nbsp;
          <span className="text-[var(--text-primary)]">{supportRef}</span>
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center mb-3">
          {onRetry ? (
            <Button type="button" variant="default" onClick={onRetry} className="inline-flex items-center justify-center gap-2">
              <ArrowsClockwise className="w-4 h-4" />
              {GLC_APP_ERROR_COPY_EN.labels.tryAgain}
            </Button>
          ) : null}
          <a
            href={homeHref}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-muted)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] no-underline transition-opacity hover:opacity-90"
          >
            <House className="w-4 h-4" />
            {homeLabel}
          </a>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <button
            type="button"
            onClick={() => { void copyDetails(); }}
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-transparent px-4 py-2 text-sm font-medium text-[var(--text-secondary)]"
          >
            <Copy className="w-4 h-4" />
            {GLC_APP_ERROR_COPY_EN.labels.copyDetailsForSupport}
          </button>
          <button
            type="button"
            disabled={reportBusy || reportSent}
            onClick={() => { void sendReport(); }}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-transparent px-4 py-2 text-sm font-medium text-[var(--glc-blue)] disabled:cursor-default disabled:opacity-50"
            style={{ cursor: reportBusy || reportSent ? 'default' : 'pointer' }}
          >
            <PaperPlaneTilt className="w-4 h-4" />
            {reportSent
              ? GLC_APP_ERROR_COPY_EN.labels.reportSent
              : reportBusy
                ? GLC_APP_ERROR_COPY_EN.labels.sending
                : GLC_APP_ERROR_COPY_EN.labels.sendReportToGlc}
          </button>
        </div>
      </div>
    </div>
  );
}
