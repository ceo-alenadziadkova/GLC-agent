import { useState, useCallback, useMemo } from 'react';
import { ArrowsClockwise, Copy, PaperPlaneTilt, House } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { formatClientEnvironmentForSupport } from '../lib/client-environment';
import { isLikelyTranslationOrExtensionDomCrash } from '../lib/browser-dom-crash-heuristics';
import { api } from '../data/apiService';

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
    'GLC Audit — incident reference',
    `Reference: ${supportRef}`,
    `Page: ${path}`,
    `Time: ${new Date().toISOString()}`,
    formatClientEnvironmentForSupport(),
  ];
  if (technicalDetail) {
    lines.push(`Detail (for support): ${technicalDetail.slice(0, 1200)}`);
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
  title = 'Something interrupted this page',
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
      toast.success('Details copied — you can paste them in an email to your contact at GLC.');
    } catch {
      toast.error('Could not copy. Please note the reference below manually.');
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
        toast.success('Thanks — we have logged this. You can still copy the reference if support asks for it.');
      } else {
        toast.message('We could not send a report from this session.', {
          description: 'Copy the reference below and share it with your GLC contact, or try again after signing in.',
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
          {likelyDomRewrite ? 'This often happens with page translation' : title}
        </h1>
        <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
          {likelyDomRewrite
            ? 'The browser or an extension probably changed the page while the app was updating. Your data is usually safe.'
            : 'A temporary problem occurred while loading or updating the screen. Your data is usually safe. Try again, go back to your home area, or share the reference below with GLC if the issue continues.'}
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
              What to do
            </p>
            <ol className="text-xs m-0 pl-4 space-y-1.5" style={{ color: 'var(--callout-warning-fg)' }}>
              <li>Turn off automatic translation for this site (icon in the address bar or browser menu).</li>
              <li>Pause extensions that rewrite pages (ad blockers, grammar tools), then reload.</li>
              <li>Tap <strong>Try again</strong>. Built-in languages for the app are planned so translate will not be required.</li>
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
            If you use automatic page translation or extensions that rewrite the page, turn them off for this site and try
            again — they can trigger this kind of error in web apps.
          </p>
        ) : null}
        <p className="text-xs font-mono mb-6 px-3 py-2 rounded-lg inline-block" style={{ backgroundColor: 'var(--bg-inset)', color: 'var(--text-tertiary)' }}>
          Reference:&nbsp;
          <span style={{ color: 'var(--text-primary)' }}>{supportRef}</span>
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center mb-3">
          {onRetry ? (
            <button type="button" onClick={onRetry} className="glc-btn-primary inline-flex items-center justify-center gap-2">
              <ArrowsClockwise className="w-4 h-4" />
              Try again
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
            Copy details for support
          </button>
          <button
            type="button"
            disabled={reportBusy || reportSent}
            onClick={() => { void sendReport(); }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            style={{ border: '1px solid var(--border-subtle)', color: 'var(--glc-blue)', background: 'transparent', cursor: reportBusy || reportSent ? 'default' : 'pointer' }}
          >
            <PaperPlaneTilt className="w-4 h-4" />
            {reportSent ? 'Report sent' : reportBusy ? 'Sending…' : 'Send report to GLC'}
          </button>
        </div>
      </div>
    </div>
  );
}
