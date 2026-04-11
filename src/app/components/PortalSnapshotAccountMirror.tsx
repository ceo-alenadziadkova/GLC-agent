/**
 * Full snapshot results on the client portal — parity with the public /snapshot "done" view.
 */

import { ensureHttpsUrl } from '@glc/intake-core';
import { CheckCircle, Lightning, SealCheck, Shield, Target, Warning } from '@phosphor-icons/react';
import type { FreeSnapshotPreview } from '../data/auditTypes';
import { formatScanCoverageLine, getSnapshotAccessBlockedState } from '../lib/snapshot-diagnostics';
import { SnapshotAccessBlockedCallout } from './snapshot/SnapshotAccessBlockedCallout';
import {
  SNAPSHOT_SCORE_COLORS,
  SNAPSHOT_SCORE_LABELS,
  SnapshotCategoryBreakdownList,
  SnapshotScoreContextNotes,
  SnapshotScoreDonut,
  snapshotClassificationExplainerLine,
  snapshotDonutFillFromLegacyBand,
  snapshotDonutFillFromOverall,
  snapshotLegacyUxBand,
  snapshotScoreColorFrom100,
  snapshotSiteProfileSoftLine,
} from './snapshot/SnapshotScoreKit';

const SEVERITY_COLOR: Record<string, string> = {
  critical: 'var(--score-1)',
  high: 'var(--score-2)',
  medium: 'var(--score-3)',
  low: 'var(--score-4)',
};

export function PortalSnapshotAccountMirror({ result }: { result: FreeSnapshotPreview }) {
  const access = getSnapshotAccessBlockedState(result);
  const calloutLimitations = access.robotsBlocked && !access.robotsLimitedSample ? [] : (result.limitations ?? []);
  const coverageLine = formatScanCoverageLine(result.scan_coverage);
  const techEntries = Object.entries(result.tech_stack ?? {}).filter(([, v]) => Array.isArray(v) && v.length > 0);
  const showSnapshotScoreBlock =
    result.ux_score !== null ||
    typeof result.overall_score === 'number' ||
    result.category_scores != null ||
    Boolean(result.ux_summary?.trim());

  const hostname =
    result.company_name?.trim() ||
    (() => {
      try {
        return new URL(ensureHttpsUrl(result.company_url)).hostname;
      } catch {
        return result.company_url;
      }
    })();

  const siteLine = snapshotSiteProfileSoftLine(result.site_profile);
  const classificationExplainer = snapshotClassificationExplainerLine(result);

  return (
    <div className="space-y-4">
      <div
        className="rounded-xl px-4 py-3.5 lg:px-5"
        style={{
          border: '1px solid rgba(28,189,255,0.22)',
          background: 'linear-gradient(135deg, rgba(28,189,255,0.10) 0%, rgba(28,189,255,0.02) 100%)',
        }}
      >
        <p className="m-0 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--glc-blue)' }}>
          Saved in your account
        </p>
        <p className="mt-2 mb-0 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          This is the same quick rule-based scan you saw before sign-up. Creating an account keeps it here so you do not
          lose results.{' '}
          <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>It is not a full GLC audit</strong> — a
          full run uses your intake brief, deeper phases, and review gates. When you continue below with
          Express or Full, you start that separate programme.
        </p>
      </div>

      <div className="text-center lg:text-left">
        <div
          className="mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs"
          style={{
            background:
              access.showCallout && access.robotsBlocked
                ? 'color-mix(in oklab, var(--glc-green) 10%, var(--bg-surface))'
                : 'var(--bg-surface)',
            border:
              access.showCallout && access.robotsBlocked
                ? '1px solid color-mix(in oklab, var(--glc-green) 38%, var(--border-subtle))'
                : '1px solid var(--border-subtle)',
            color: 'var(--text-tertiary)',
          }}
        >
          {access.showCallout ? (
            access.robotsBlocked ? (
              <>
                <SealCheck className="h-3 w-3 shrink-0" style={{ color: 'var(--glc-green)' }} weight="fill" />
                {access.robotsLimitedSample
                  ? 'Preview limited — inner pages sampled'
                  : 'Preview limited — robots.txt policy'}
              </>
            ) : (
              <>
                <Warning className="h-3 w-3 shrink-0" style={{ color: 'var(--score-2)' }} weight="fill" />
                Preview incomplete — pages not loaded
              </>
            )
          ) : (
            <>
              <CheckCircle className="h-3 w-3" style={{ color: 'var(--glc-green)' }} /> Your check is ready
            </>
          )}
        </div>
        <h2
          className="m-0 break-words text-xl font-bold tracking-tight lg:text-2xl"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
        >
          {hostname}
        </h2>
        {result.location ? (
          <p className="mt-1 text-sm" style={{ color: 'var(--text-tertiary)' }}>
            {result.location}
          </p>
        ) : null}
      </div>

      <SnapshotAccessBlockedCallout
        robotsBlocked={access.robotsBlocked}
        noHtmlSample={access.noPages}
        robotsLimitedSample={access.robotsLimitedSample}
        robotsFallbackSiteClass={access.robotsFallbackSiteClass}
        robotsHeadHttpStatus={result.scan_coverage?.robots_head_probe?.status}
        limitations={calloutLimitations}
      />

      {result.homepage_snippet &&
        (result.homepage_snippet.title.trim() || result.homepage_snippet.description.trim()) && (
          <div
            className="glc-card glc-snapshot-result-card p-5 text-left lg:p-6"
            style={{ borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-subtle)' }}
          >
            <p
              className="mb-3 text-xs font-semibold uppercase tracking-wide"
              style={{ color: 'var(--text-tertiary)' }}
            >
              From your homepage
            </p>
            {result.homepage_snippet.title.trim() ? (
              <p
                className="mb-2 text-sm font-semibold leading-snug"
                style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
              >
                {result.homepage_snippet.title}
              </p>
            ) : null}
            {result.homepage_snippet.description.trim() ? (
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {result.homepage_snippet.description}
              </p>
            ) : null}
            <p className="mt-3 mb-0 text-xs leading-relaxed" style={{ color: 'var(--text-quaternary)' }}>
              Taken from the HTML we fetched: page title, meta description, Open Graph text, or the first substantive
              paragraph when those are missing.
            </p>
          </div>
        )}

      {siteLine ? (
        <div
          className="glc-card glc-snapshot-result-card p-5 text-left lg:p-6"
          style={{ borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-subtle)' }}
        >
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
            Site read (advisory)
          </p>
          <p className="m-0 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {siteLine}
          </p>
          {(result.classification_confidence_band || result.site_profile?.classificationConfidenceBand) && (
            <p className="mt-2 mb-0 text-xs" style={{ color: 'var(--text-quaternary)' }}>
              Classification confidence:{' '}
              {result.classification_confidence_band ?? result.site_profile?.classificationConfidenceBand}
            </p>
          )}
          {classificationExplainer ? (
            <p className="mt-2 mb-0 text-xs leading-relaxed" style={{ color: 'var(--text-quaternary)' }}>
              {classificationExplainer}
            </p>
          ) : null}
        </div>
      ) : null}

      {showSnapshotScoreBlock &&
        (result.ux_summary?.trim() ? (
          <div className="lg:grid lg:grid-cols-12 lg:items-stretch lg:gap-6">
            <div
              className="glc-card glc-snapshot-result-card glc-snapshot-surface-hero mb-4 flex min-h-0 flex-col items-center justify-center p-6 text-center lg:col-span-5 lg:mb-0 lg:min-h-[15rem] lg:p-8"
              style={{ borderRadius: 'var(--radius-xl)' }}
            >
              <p
                className="mb-3 text-xs font-medium"
                style={{ color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}
              >
                Snapshot score
              </p>
              {typeof result.overall_score === 'number' ? (
                <SnapshotScoreDonut
                  fillPercent={snapshotDonutFillFromOverall(result.overall_score)}
                  accentColor={snapshotScoreColorFrom100(result.overall_score)}
                  size={180}
                  strokeWidth={12}
                >
                  <p
                    style={{
                      fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
                      fontWeight: 800,
                      fontFamily: 'var(--font-display)',
                      color: snapshotScoreColorFrom100(result.overall_score),
                      lineHeight: 1.05,
                    }}
                  >
                    {result.overall_score}
                    <span style={{ color: 'var(--text-quaternary)', fontWeight: 700, fontSize: '0.45em' }}>/100</span>
                  </p>
                </SnapshotScoreDonut>
              ) : (
                (() => {
                  const band = snapshotLegacyUxBand(result.ux_score);
                  const c = SNAPSHOT_SCORE_COLORS[band];
                  return (
                    <SnapshotScoreDonut
                      fillPercent={snapshotDonutFillFromLegacyBand(band)}
                      accentColor={c}
                      size={180}
                      strokeWidth={12}
                    >
                      <p
                        style={{
                          fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
                          fontWeight: 800,
                          fontFamily: 'var(--font-display)',
                          color: c,
                          lineHeight: 1.05,
                        }}
                      >
                        {band}/5
                      </p>
                      <p className="mt-0.5 text-xs font-semibold sm:text-sm" style={{ color: c }}>
                        {SNAPSHOT_SCORE_LABELS[band]}
                      </p>
                    </SnapshotScoreDonut>
                  );
                })()
              )}
              {result.scan_confidence_band ? (
                <p className="mt-2 text-xs" style={{ color: 'var(--text-quaternary)' }}>
                  Scan confidence: {result.scan_confidence_band}
                </p>
              ) : null}
            </div>
            <div
              className="glc-card glc-snapshot-result-card flex flex-col justify-center p-6 text-left lg:col-span-7 lg:p-8"
              style={{ borderRadius: 'var(--radius-xl)' }}
            >
              <div className="glc-snapshot-section-h glc-snapshot-section-h--neutral !mb-3">
                <span className="glc-snapshot-section-h__rule" aria-hidden />
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
                  Summary
                </span>
              </div>
              <p className="text-pretty text-sm leading-relaxed lg:text-[0.9375rem]" style={{ color: 'var(--text-secondary)' }}>
                {result.ux_summary}
              </p>
              <SnapshotScoreContextNotes result={result} />
            </div>
          </div>
        ) : (
          <div
            className="glc-card glc-snapshot-result-card glc-snapshot-surface-hero mb-4 flex flex-row items-center justify-between p-6 mobile:flex-col mobile:gap-4 mobile:p-5"
            style={{ borderRadius: 'var(--radius-xl)' }}
          >
            <div className="flex min-w-0 flex-1 flex-col items-center gap-3 mobile:w-full lg:flex-row lg:items-center lg:justify-center lg:gap-10">
              <div className="flex w-full flex-col items-center text-center mobile:items-center lg:w-auto lg:shrink-0">
                <p
                  className="mb-1 text-xs font-medium lg:sr-only"
                  style={{ color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}
                >
                  Snapshot score
                </p>
                {typeof result.overall_score === 'number' ? (
                  <SnapshotScoreDonut
                    fillPercent={snapshotDonutFillFromOverall(result.overall_score)}
                    accentColor={snapshotScoreColorFrom100(result.overall_score)}
                    size={148}
                    strokeWidth={10}
                  >
                    <p
                      style={{
                        fontSize: 'var(--text-3xl)',
                        fontWeight: 800,
                        fontFamily: 'var(--font-display)',
                        color: snapshotScoreColorFrom100(result.overall_score),
                        lineHeight: 1.05,
                      }}
                    >
                      {result.overall_score}
                      <span style={{ color: 'var(--text-quaternary)', fontWeight: 700, fontSize: '0.5em' }}>/100</span>
                    </p>
                  </SnapshotScoreDonut>
                ) : (
                  (() => {
                    const band = snapshotLegacyUxBand(result.ux_score);
                    const c = SNAPSHOT_SCORE_COLORS[band];
                    return (
                      <SnapshotScoreDonut
                        fillPercent={snapshotDonutFillFromLegacyBand(band)}
                        accentColor={c}
                        size={148}
                        strokeWidth={10}
                      >
                        <p
                          style={{
                            fontSize: 'var(--text-3xl)',
                            fontWeight: 800,
                            fontFamily: 'var(--font-display)',
                            color: c,
                            lineHeight: 1.05,
                          }}
                        >
                          {band}/5
                        </p>
                        <p className="mt-0.5 text-sm font-semibold" style={{ color: c }}>
                          {SNAPSHOT_SCORE_LABELS[band]}
                        </p>
                      </SnapshotScoreDonut>
                    );
                  })()
                )}
              </div>
              <div className="min-w-0 w-full text-center mobile:text-center lg:flex-1 lg:text-left">
                <p
                  className="mb-2 hidden text-xs font-medium lg:block"
                  style={{ color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}
                >
                  Snapshot score
                </p>
                {typeof result.overall_score !== 'number' && result.ux_label ? (
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    {result.ux_label}
                  </p>
                ) : null}
                {result.scan_confidence_band ? (
                  <p className="mt-2 text-xs lg:mt-2" style={{ color: 'var(--text-quaternary)' }}>
                    Scan confidence: {result.scan_confidence_band}
                  </p>
                ) : null}
                <SnapshotScoreContextNotes result={result} showTopDivider />
              </div>
            </div>
          </div>
        ))}

      {coverageLine ? (
        <p className="px-1 text-center text-xs lg:px-0 lg:text-left" style={{ color: 'var(--text-quaternary)' }}>
          {coverageLine}
        </p>
      ) : null}

      {!access.showCallout && result.limitations && result.limitations.length > 0 ? (
        <div className="glc-snapshot-limitations mx-auto max-w-lg lg:mx-0 lg:max-w-none">
          <ul className="list-disc space-y-1.5 pl-4 text-left text-xs" style={{ color: 'var(--callout-warning-fg)' }}>
            {result.limitations.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <SnapshotCategoryBreakdownList result={result} />

      {result.program_recommendations && result.program_recommendations.length > 0 ? (
        <div
          className="glc-card glc-snapshot-result-card p-5 lg:p-6"
          style={{ borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-subtle)' }}
        >
          <div className="glc-snapshot-section-h glc-snapshot-section-h--info !mb-3">
            <span className="glc-snapshot-section-h__rule" aria-hidden />
            <Target className="h-4 w-4 shrink-0" style={{ color: 'var(--glc-blue)' }} />
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              Suggested next steps
            </span>
          </div>
          <div className="space-y-3">
            {result.program_recommendations.map(rec => (
              <div key={rec.id} className="glc-snapshot-insight-row flex gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {rec.title}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                    {rec.description}
                  </p>
                  <p className="mt-1 mb-0 text-[0.65rem] uppercase tracking-wide" style={{ color: 'var(--text-quaternary)' }}>
                    Priority: {rec.priority}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {result.signals_found && result.signals_found.length > 0 ? (
        <div className="mb-2">
          <p
            className="mb-2 text-center text-[0.65rem] font-medium uppercase tracking-wider sm:text-xs lg:text-left"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Detected on your pages (this scan)
          </p>
          <div className="flex flex-wrap justify-center gap-2 lg:justify-start">
            {result.signals_found.map((s, i) => (
              <span
                key={i}
                className="glc-snapshot-signal-pill rounded-full px-2.5 py-1 text-xs font-medium"
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                }}
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {(result.issues.length > 0 || result.quick_wins.length > 0 || techEntries.length > 0) && (
        <div className="grid gap-4 lg:grid-cols-2">
          {result.issues.length > 0 ? (
            <div className="glc-card glc-snapshot-result-card p-5 lg:p-6" style={{ borderRadius: 'var(--radius-xl)' }}>
              <div className="glc-snapshot-section-h glc-snapshot-section-h--warning">
                <span className="glc-snapshot-section-h__rule" aria-hidden />
                <Warning className="h-4 w-4 shrink-0" style={{ color: 'var(--score-2)' }} />
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                  Top issues
                </span>
              </div>
              <div className="space-y-1">
                {result.issues.map(issue => (
                  <div key={issue.id} className="glc-snapshot-insight-row flex gap-3">
                    <div
                      className="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full"
                      style={{
                        backgroundColor: SEVERITY_COLOR[issue.severity] ?? 'var(--text-tertiary)',
                        marginTop: 6,
                      }}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        {issue.title}
                      </p>
                      <p className="mt-0.5 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        {issue.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {result.quick_wins.length > 0 ? (
            <div className="glc-card glc-snapshot-result-card p-5 lg:p-6" style={{ borderRadius: 'var(--radius-xl)' }}>
              <div className="glc-snapshot-section-h glc-snapshot-section-h--positive">
                <span className="glc-snapshot-section-h__rule" aria-hidden />
                <Lightning className="h-4 w-4 shrink-0" style={{ color: 'var(--glc-green)' }} weight="fill" />
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                  Quick wins
                </span>
              </div>
              <div className="space-y-1">
                {result.quick_wins.map(qw => (
                  <div key={qw.id} className="glc-snapshot-insight-row flex gap-3">
                    <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color: 'var(--glc-green)' }} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        {qw.title}
                      </p>
                      <p className="mt-0.5 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        {qw.effort} · {qw.timeframe}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {techEntries.length > 0 ? (
            <div className="glc-card glc-snapshot-result-card p-5 lg:p-6 lg:col-span-2" style={{ borderRadius: 'var(--radius-xl)' }}>
              <div className="glc-snapshot-section-h glc-snapshot-section-h--info !mb-3">
                <span className="glc-snapshot-section-h__rule" aria-hidden />
                <Shield className="h-4 w-4 shrink-0" style={{ color: 'var(--glc-blue)' }} />
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                  Tech stack detected
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {techEntries.flatMap(([, vals]) => vals).slice(0, 24).map((tech, i) => (
                  <span
                    key={i}
                    className="glc-snapshot-signal-pill rounded-full px-2.5 py-1 text-xs font-medium"
                    style={{
                      background: 'var(--bg-inset)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
