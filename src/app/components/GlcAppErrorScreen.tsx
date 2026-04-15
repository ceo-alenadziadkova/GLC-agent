import { useState, useCallback, useMemo } from 'react';
import { ArrowsClockwise, Copy, PaperPlaneTilt, House } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { formatClientEnvironmentForSupport } from '../lib/client-environment';
import { isLikelyTranslationOrExtensionDomCrash } from '../lib/browser-dom-crash-heuristics';
import { api } from '../data/apiService';
import { GLC_APP_ERROR_COPY_EN } from '../config/translation-safety-copy.en';

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
    <div className="min-h-screen flex items-center justify-center px-6 py-12" style={{ backgroundColor: 'var(--bg-surface)' }}>
      <div className="w-full max-w-md text-center">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-5"
          style={{ backgroundColor: 'var(--callout-info-bg)', border: '1px solid var(--callout-info-border)' }}
        >
          <ArrowsClockwise className="w-6 h-6" style={{ color: 'var(--glc-blue)' }} />
        </div>
        <h1
          className="font-semibold mb-2"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-xl)',
            color: 'var(--text-primary)',
            letterSpacing: 'var(--tracking-tight)',
          }}
        >
          {likelyDomRewrite ? GLC_APP_ERROR_COPY_EN.domRewrite.title : title}
        </h1>
        <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
          {likelyDomRewrite
            ? GLC_APP_ERROR_COPY_EN.domRewrite.description
            : GLC_APP_ERROR_COPY_EN.generic.description}
        </p>
        {likelyDomRewrite ? (
          <div
            className="text-sm leading-relaxed mb-4 mx-auto max-w-sm rounded-xl px-4 py-3 text-left"
            style={{
              backgroundColor: 'var(--callout-warning-bg)',
              border: '1px solid var(--callout-warning-border)',
              color: 'var(--callout-warning-fg)',
            }}
          >
            <p className="font-semibold m-0 mb-2" style={{ color: 'var(--callout-warning-fg-emphasis)' }}>
              {GLC_APP_ERROR_COPY_EN.domRewrite.actionsTitle}
            </p>
            <ol className="text-xs m-0 pl-4 space-y-1.5" style={{ color: 'var(--callout-warning-fg)' }}>
              {GLC_APP_ERROR_COPY_EN.domRewrite.actions.map((action) => (
                <li key={action}>{action}</li>
              ))}
            </ol>
          </div>
        ) : null}
        {!likelyDomRewrite ? (
          <p
            className="text-xs leading-relaxed mb-4 mx-auto max-w-sm rounded-lg px-3 py-2.5"
            style={{
              backgroundColor: 'var(--callout-info-bg)',
              border: '1px solid var(--callout-info-border)',
              color: 'var(--text-secondary)',
            }}
          >
            {GLC_APP_ERROR_COPY_EN.generic.translationHint}
          </p>
        ) : null}
        <p className="text-xs font-mono mb-6 px-3 py-2 rounded-lg inline-block" style={{ backgroundColor: 'var(--bg-inset)', color: 'var(--text-tertiary)' }}>
          {GLC_APP_ERROR_COPY_EN.labels.reference}:&nbsp;
          <span style={{ color: 'var(--text-primary)' }}>{supportRef}</span>
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center mb-3">
          {onRetry ? (
            <button type="button" onClick={onRetry} className="glc-btn-primary inline-flex items-center justify-center gap-2">
              <ArrowsClockwise className="w-4 h-4" />
              {GLC_APP_ERROR_COPY_EN.labels.tryAgain}
            </button>
          ) : null}
          <a
            href={homeHref}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold no-underline transition-opacity hover:opacity-90"
            style={{ border: '1px solid var(--border-default)', color: 'var(--text-primary)', backgroundColor: 'var(--bg-muted)' }}
          >
            <House className="w-4 h-4" />
            {homeLabel}
          </a>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <button
            type="button"
            onClick={() => { void copyDetails(); }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
            style={{ border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', background: 'transparent', cursor: 'pointer' }}
          >
            <Copy className="w-4 h-4" />
            {GLC_APP_ERROR_COPY_EN.labels.copyDetailsForSupport}
          </button>
          <button
            type="button"
            disabled={reportBusy || reportSent}
            onClick={() => { void sendReport(); }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            style={{ border: '1px solid var(--border-subtle)', color: 'var(--glc-blue)', background: 'transparent', cursor: reportBusy || reportSent ? 'default' : 'pointer' }}
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
