import { motion } from 'motion/react';
import { ensureHttpsUrl } from '@glc/intake-core';
import type { FreeSnapshotPreview } from '../../../data/auditTypes';
import { Surface } from '../../../components/ui/surface';
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
      className="ds-snapshot-results-stack"
    >
      {/* Company header — mobile centered; desktop aligned with bento column */}
      <div className="mb-8 text-center mobile:mb-6 lg:mb-7 lg:text-left">
        <AccessStatusBadge
          snapshotShowsAccessCallout={snapshotShowsAccessCallout}
          snapshotAccessRobotsBlocked={snapshotAccessRobotsBlocked}
          snapshotAccessRobotsLimited={snapshotAccessRobotsLimited}
        />
        <h2 className="break-words text-2xl font-bold tracking-tight text-[var(--text-primary)] [font-family:var(--font-display)] mobile:px-1 mobile:text-xl lg:max-w-[22ch]">
          {result.company_name ?? new URL(ensureHttpsUrl(result.company_url)).hostname}
        </h2>
        {result.location && (
          <p className="mt-1 text-sm text-[var(--text-tertiary)] lg:mt-1.5">{result.location}</p>
        )}
      </div>

      <SnapshotAccessBlockedCallout
        robotsBlocked={snapshotAccessRobotsBlocked}
        noHtmlSample={snapshotAccessNoPages}
        robotsLimitedSample={snapshotAccessRobotsLimited}
        robotsFallbackSiteClass={snapshotAccess?.robotsFallbackSiteClass as 'standard' | 'major_platform' | undefined}
        robotsHeadHttpStatus={result.scan_coverage?.robots_head_probe?.status}
        limitations={snapshotCalloutLimitations}
      />

      <HomepageSnippetCard result={result} />
      <SiteProfileCard result={result} snapshotClassificationExplainer={snapshotClassificationExplainer} />

      {/* Snapshot score: bento on lg when summary exists; else single card */}
      {(result.ux_score !== null || typeof result.overall_score === 'number') &&
        (result.ux_summary?.trim() ? (
          <div className="mb-4 lg:grid lg:grid-cols-12 lg:items-stretch lg:gap-6">
            <Surface
              padding="none"
              className="ds-card ds-snapshot-result-card ds-snapshot-surface-hero mb-4 flex min-h-0 flex-col items-center justify-center rounded-[var(--radius-xl)] p-6 text-center lg:col-span-5 lg:mb-0 lg:p-8 ds-snapshot-score-hero-minh"
            >
              <p className="mb-3 text-xs font-medium uppercase ds-snapshot-section-eyebrow text-[var(--text-tertiary)]">
                {SNAPSHOT_LANDING_HERO_COPY.snapshotScoreLabel}
              </p>
              <SnapshotScoreBadge
                variant="bento"
                overallScore={typeof result.overall_score === 'number' ? result.overall_score : null}
                uxScore={result.ux_score}
              />
              {result.scan_confidence_band && (
                <p className="mt-2 text-xs text-[var(--text-tertiary)]">
                  {SNAPSHOT_LANDING_HERO_COPY.scanConfidencePrefix} {result.scan_confidence_band}
                </p>
              )}
            </Surface>
            <Surface
              padding="none"
              className="ds-card ds-snapshot-result-card flex flex-col justify-center rounded-[var(--radius-xl)] p-6 text-left lg:col-span-7 lg:p-8"
            >
              <div className="ds-snapshot-section-h ds-snapshot-section-h--neutral !mb-3">
                <span className="ds-snapshot-section-h__rule" aria-hidden />
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                  {SNAPSHOT_LANDING_HERO_COPY.summaryLabel}
                </span>
              </div>
              <p className="text-pretty text-sm leading-relaxed text-[var(--text-secondary)] lg:text-[length:var(--text-base)]">
                {result.ux_summary}
              </p>
              <SnapshotScoreContextNotes result={result} />
            </Surface>
          </div>
        ) : (
          <Surface
            padding="none"
            className="ds-card ds-snapshot-result-card ds-snapshot-surface-hero mb-4 flex flex-row items-center justify-between rounded-[var(--radius-xl)] p-6 mobile:flex-col mobile:gap-4 mobile:p-5"
          >
            <div className="flex min-w-0 flex-1 flex-col items-center gap-3 mobile:w-full lg:flex-row lg:items-center lg:justify-center lg:gap-10">
              <div className="flex w-full flex-col items-center text-center mobile:items-center lg:w-auto lg:shrink-0">
                <p className="mb-1 text-xs font-medium uppercase ds-snapshot-section-eyebrow text-[var(--text-tertiary)] lg:sr-only">
                  {SNAPSHOT_LANDING_HERO_COPY.snapshotScoreLabel}
                </p>
                <SnapshotScoreBadge
                  variant="compact"
                  overallScore={typeof result.overall_score === 'number' ? result.overall_score : null}
                  uxScore={result.ux_score}
                />
              </div>
              <div className="w-full min-w-0 text-center mobile:text-center lg:flex-1 lg:text-left">
                <p className="mb-2 hidden text-xs font-medium uppercase ds-snapshot-section-eyebrow text-[var(--text-tertiary)] lg:block">
                  {SNAPSHOT_LANDING_HERO_COPY.snapshotScoreLabel}
                </p>
                {typeof result.overall_score !== 'number' && result.ux_label ? (
                  <p className="text-xs text-[var(--text-tertiary)]">{result.ux_label}</p>
                ) : null}
                {result.scan_confidence_band && (
                  <p className="mt-2 text-xs text-[var(--text-tertiary)] lg:mt-2">
                    {SNAPSHOT_LANDING_HERO_COPY.scanConfidencePrefix} {result.scan_confidence_band}
                  </p>
                )}
                <SnapshotScoreContextNotes result={result} showTopDivider />
              </div>
            </div>
          </Surface>
        ))}

      {snapshotCoverageCaption && (
        <p className="mb-4 px-2 text-center text-xs text-[var(--text-tertiary)] lg:px-0 lg:text-left">
          {snapshotCoverageCaption}
        </p>
      )}

      {snapshotLimitations && (
        <div className="ds-snapshot-limitations mx-auto max-w-lg lg:mx-0 lg:max-w-none">
          <ul className="list-disc space-y-1.5 pl-4 text-left text-xs text-[var(--callout-warning-fg)]">
            {snapshotLimitations.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
      )}

      <CategoryBreakdownSection result={result} />

      {result.signals_found && result.signals_found.length > 0 && (
        <div className="mb-4">
          <p className="ds-snapshot-signals-heading mb-2 text-center text-[var(--text-tertiary)] lg:text-left">
            {SNAPSHOT_LANDING_HERO_COPY.detectedSignalsTitle}
          </p>
          <div className="flex flex-wrap justify-center gap-2 lg:justify-start">
            {result.signals_found.map((s, i) => (
              <span
                key={i}
                className="ds-snapshot-signal-pill rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)]"
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

