import { motion } from 'motion/react';
import { ensureHttpsUrl } from '@glc/intake-core';
import type { FreeSnapshotPreview } from '../../../data/auditTypes';
import { SnapshotAccessBlockedCallout } from '../../../components/snapshot/SnapshotAccessBlockedCallout';
import { SnapshotScoreBadge, SnapshotScoreContextNotes } from '..';
import { SNAPSHOT_LANDING_HERO_COPY } from '../../../config/snapshot-landing-copy.en';
import {
  AccessStatusBadge,
  CategoryBreakdownSection,
  HomepageSnippetCard,
  InsightsGridSection,
  NeuralVisibilitySection,
  ResultsCtaBand,
  SiteProfileCard,
} from './results';

type SnapshotAccess = { robotsFallbackSiteClass?: string } | null;

type TechEntries = Array<[string, string[]]>;

export function SnapshotLandingResults(props: {
  result: FreeSnapshotPreview;
  snapshotAccess: SnapshotAccess;
  snapshotShowsAccessCallout: boolean;
  snapshotAccessRobotsBlocked: boolean;
  snapshotAccessNoPages: boolean;
  snapshotAccessRobotsLimited: boolean;
  snapshotCalloutLimitations: string[];
  snapshotClassificationExplainer: string | null;
  snapshotCoverageCaption: string | null;
  snapshotLimitations: string[] | null;
  snapshotInsightBlockCount: number;
  snapshotInsightGridClass: string;
  snapshotTechColClass: string;
  techEntries: TechEntries;
  quotaHint: string;
  reset: () => void;
}) {
  const {
    result,
    snapshotAccess,
    snapshotShowsAccessCallout,
    snapshotAccessRobotsBlocked,
    snapshotAccessNoPages,
    snapshotAccessRobotsLimited,
    snapshotCalloutLimitations,
    snapshotClassificationExplainer,
    snapshotCoverageCaption,
    snapshotLimitations,
    snapshotInsightBlockCount,
    snapshotInsightGridClass,
    snapshotTechColClass,
    techEntries,
    quotaHint,
    reset,
  } = props;

  return (
    <motion.div
      layout={false}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="mx-auto w-full min-w-0 max-w-[min(100%,38.75rem)] lg:max-w-6xl"
    >
      {/* Company header — mobile centered; desktop aligned with bento column */}
      <div className="mb-8 text-center mobile:mb-6 lg:mb-7 lg:text-left">
        <AccessStatusBadge
          snapshotShowsAccessCallout={snapshotShowsAccessCallout}
          snapshotAccessRobotsBlocked={snapshotAccessRobotsBlocked}
          snapshotAccessRobotsLimited={snapshotAccessRobotsLimited}
        />
        <h2
          className="break-words text-2xl font-bold tracking-tight mobile:px-1 mobile:text-xl lg:max-w-[22ch]"
          style={{
            fontFamily: 'var(--font-display)',
            color: 'var(--text-primary)',
          }}
        >
          {result.company_name ?? new URL(ensureHttpsUrl(result.company_url)).hostname}
        </h2>
        {result.location && (
          <p className="mt-1 text-sm lg:mt-1.5" style={{ color: 'var(--text-tertiary)' }}>
            {result.location}
          </p>
        )}
      </div>

      <SnapshotAccessBlockedCallout
        robotsBlocked={snapshotAccessRobotsBlocked}
        noHtmlSample={snapshotAccessNoPages}
        robotsLimitedSample={snapshotAccessRobotsLimited}
        robotsFallbackSiteClass={snapshotAccess?.robotsFallbackSiteClass}
        robotsHeadHttpStatus={result.scan_coverage?.robots_head_probe?.status}
        limitations={snapshotCalloutLimitations}
      />

      <HomepageSnippetCard result={result} />
      <SiteProfileCard result={result} snapshotClassificationExplainer={snapshotClassificationExplainer} />

      {/* Snapshot score: bento on lg when summary exists; else single card */}
      {(result.ux_score !== null || typeof result.overall_score === 'number') &&
        (result.ux_summary?.trim() ? (
          <div className="mb-4 lg:grid lg:grid-cols-12 lg:items-stretch lg:gap-6">
            <div
              className="glc-card glc-snapshot-result-card glc-snapshot-surface-hero mb-4 flex min-h-0 flex-col items-center justify-center p-6 text-center lg:col-span-5 lg:mb-0 lg:min-h-[15rem] lg:p-8"
              style={{ borderRadius: 'var(--radius-xl)' }}
            >
              <p
                className="mb-3 text-xs font-medium"
                style={{ color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}
              >
                {SNAPSHOT_LANDING_HERO_COPY.snapshotScoreLabel}
              </p>
              <SnapshotScoreBadge
                variant="bento"
                overallScore={typeof result.overall_score === 'number' ? result.overall_score : null}
                uxScore={result.ux_score}
              />
              {result.scan_confidence_band && (
                <p className="mt-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  {SNAPSHOT_LANDING_HERO_COPY.scanConfidencePrefix} {result.scan_confidence_band}
                </p>
              )}
            </div>
            <div
              className="glc-card glc-snapshot-result-card flex flex-col justify-center p-6 text-left lg:col-span-7 lg:p-8"
              style={{ borderRadius: 'var(--radius-xl)' }}
            >
              <div className="glc-snapshot-section-h glc-snapshot-section-h--neutral !mb-3">
                <span className="glc-snapshot-section-h__rule" aria-hidden />
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
                  {SNAPSHOT_LANDING_HERO_COPY.summaryLabel}
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
                  {SNAPSHOT_LANDING_HERO_COPY.snapshotScoreLabel}
                </p>
                <SnapshotScoreBadge
                  variant="compact"
                  overallScore={typeof result.overall_score === 'number' ? result.overall_score : null}
                  uxScore={result.ux_score}
                />
              </div>
              <div className="w-full min-w-0 text-center mobile:text-center lg:flex-1 lg:text-left">
                <p
                  className="mb-2 hidden text-xs font-medium lg:block"
                  style={{ color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}
                >
                  {SNAPSHOT_LANDING_HERO_COPY.snapshotScoreLabel}
                </p>
                {typeof result.overall_score !== 'number' && result.ux_label ? (
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    {result.ux_label}
                  </p>
                ) : null}
                {result.scan_confidence_band && (
                  <p className="mt-2 text-xs lg:mt-2" style={{ color: 'var(--text-tertiary)' }}>
                    {SNAPSHOT_LANDING_HERO_COPY.scanConfidencePrefix} {result.scan_confidence_band}
                  </p>
                )}
                <SnapshotScoreContextNotes result={result} showTopDivider />
              </div>
            </div>
          </div>
        ))}

      {snapshotCoverageCaption && (
        <p className="mb-4 text-center text-xs px-2 lg:px-0 lg:text-left" style={{ color: 'var(--text-tertiary)' }}>
          {snapshotCoverageCaption}
        </p>
      )}

      {snapshotLimitations && (
        <div className="glc-snapshot-limitations mx-auto max-w-lg lg:mx-0 lg:max-w-none">
          <ul className="list-disc space-y-1.5 pl-4 text-left text-xs" style={{ color: 'var(--callout-warning-fg)' }}>
            {snapshotLimitations.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
      )}

      <CategoryBreakdownSection result={result} />

      {result.signals_found && result.signals_found.length > 0 && (
        <div className="mb-4">
          <p
            className="mb-2 text-center text-[0.65rem] font-medium uppercase tracking-wider lg:text-left sm:text-xs"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {SNAPSHOT_LANDING_HERO_COPY.detectedSignalsTitle}
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
      )}

      <InsightsGridSection
        result={result}
        snapshotInsightBlockCount={snapshotInsightBlockCount}
        snapshotInsightGridClass={snapshotInsightGridClass}
        snapshotTechColClass={snapshotTechColClass}
        techEntries={techEntries}
      />

      <NeuralVisibilitySection result={result} />

      <ResultsCtaBand quotaHint={quotaHint} reset={reset} />
    </motion.div>
  );
}

