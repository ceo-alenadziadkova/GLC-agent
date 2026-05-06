import { useId } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Lightning, Warning } from '@phosphor-icons/react';
import { REPORT_VIEWER_CONSTANTS } from '../config/report-viewer.constants';
import { REPORT_VIEWER_COPY } from '../config/report-viewer.copy.en';

function splitSummaryParagraphs(summary: string | null): string[] {
  if (!summary) return [];
  const normalized = summary.trim();
  if (!normalized) return [];
  const explicitParagraphs = normalized
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);
  if (explicitParagraphs.length > 1) return explicitParagraphs;

  // Fallback for LLM outputs that arrive as a single text wall.
  const sentences = normalized
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
  if (sentences.length < 3) return explicitParagraphs;

  const chunks: string[] = [];
  let currentChunk = '';
  for (const sentence of sentences) {
    const nextChunk = currentChunk ? `${currentChunk} ${sentence}` : sentence;
    if (nextChunk.length > 260 && currentChunk) {
      chunks.push(currentChunk);
      currentChunk = sentence;
      continue;
    }
    currentChunk = nextChunk;
  }
  if (currentChunk) chunks.push(currentChunk);
  return chunks;
}

type ReportHeroCardProps = {
  companyName: string;
  industry: string | null;
  createdAt: string;
  executiveSummary: string | null;
  averageScore: number;
  criticalIssueCount: number;
  quickWinsCount: number;
};

export function ReportHeroCard({
  companyName,
  industry,
  createdAt,
  executiveSummary,
  averageScore,
  criticalIssueCount,
  quickWinsCount,
}: ReportHeroCardProps) {
  const shouldReduceMotion = useReducedMotion();
  const { center, radius, sizePx, strokeWidth } = REPORT_VIEWER_CONSTANTS.scoreRing;
  const circumference = 2 * Math.PI * radius;
  const summaryParagraphs = splitSummaryParagraphs(executiveSummary);
  const scoreRingId = useId();
  const scoreRingTitleId = `${scoreRingId}-title`;
  const scoreRingDescId = `${scoreRingId}-desc`;

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: REPORT_VIEWER_CONSTANTS.motion.heroEnterOffsetY }}
      animate={{ opacity: 1, y: 0 }}
      transition={shouldReduceMotion
        ? { duration: 0 }
        : {
            duration: REPORT_VIEWER_CONSTANTS.motion.heroEnterDurationSec,
            ease: REPORT_VIEWER_CONSTANTS.easing,
          }}
      className="relative overflow-hidden glc-orb-decor ds-report-hero-shell"
    >
      <div className="ds-report-hero-mesh pointer-events-none absolute inset-0" />
      <div className="relative flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <p className="glc-kicker ds-report-hero-kicker">
            {REPORT_VIEWER_COPY.sections.executiveSummary}
          </p>
          <h2 className="ds-report-hero-title mt-2">
            {companyName}
          </h2>
          <p className="ds-report-hero-meta mt-1">
            {industry || 'General'} ·{' '}
            {new Date(createdAt).toLocaleDateString(REPORT_VIEWER_CONSTANTS.dateLocale, {
              month: 'long',
              year: 'numeric',
            })}
          </p>
          {summaryParagraphs.length > 0 && (
            <div className="ds-report-hero-summary mt-4 space-y-3">
              {summaryParagraphs.map((paragraph, index) => (
                <p key={`${index}-${paragraph.slice(0, 24)}`} className="leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>
          )}
          <div className="mt-5 flex flex-wrap gap-2">
            {[
              {
                icon: Warning,
                label: `${criticalIssueCount} ${REPORT_VIEWER_COPY.findings.criticalIssuesSuffix}`,
                iconClass: 'ds-icon-critical',
              },
              {
                icon: Lightning,
                label: `${quickWinsCount} ${REPORT_VIEWER_COPY.findings.quickWinsSuffix}`,
                iconClass: 'ds-icon-success',
              },
            ].map(({ icon: Icon, label, iconClass }) => (
              <div
                key={label}
                className="ds-report-hero-pill flex items-center gap-1.5 rounded-full px-3 py-1.5"
              >
                <Icon className={`h-3 w-3 shrink-0 ${iconClass}`} />
                {label}
              </div>
            ))}
          </div>
        </div>

        <div className="ds-report-hero-score-panel flex w-full flex-col items-center gap-2 rounded-2xl px-5 py-4 md:w-auto md:shrink-0 md:px-6 md:py-5">
          <svg
            width={sizePx}
            height={sizePx}
            className="shrink-0"
            role="img"
            aria-labelledby={`${scoreRingTitleId} ${scoreRingDescId}`}
          >
            <title id={scoreRingTitleId}>{REPORT_VIEWER_COPY.sections.overall}</title>
            <desc id={scoreRingDescId}>{`Average score ${averageScore.toFixed(1)} out of ${REPORT_VIEWER_CONSTANTS.scoreMax}`}</desc>
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              className="ds-report-hero-ring-track"
              strokeWidth={strokeWidth}
            />
            <motion.circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={shouldReduceMotion ? false : { strokeDashoffset: circumference }}
              animate={{
                strokeDashoffset:
                  circumference * (1 - averageScore / REPORT_VIEWER_CONSTANTS.scoreMax),
              }}
              transition={shouldReduceMotion
                ? { duration: 0 }
                : { duration: 1, delay: 0.3, ease: REPORT_VIEWER_CONSTANTS.easing }}
              transform={`rotate(-90 ${center} ${center})`}
              className="ds-report-hero-ring-glow ds-stroke-brand"
            />
            <text
              x={center}
              y={center + 4}
              textAnchor="middle"
              className="ds-report-hero-score-value"
            >
              {averageScore.toFixed(1)}
            </text>
          </svg>
          <span className="ds-report-hero-score-label">
            {REPORT_VIEWER_COPY.sections.overall}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
