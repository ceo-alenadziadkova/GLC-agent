import { motion } from 'motion/react';
import { Lightning, Warning } from '@phosphor-icons/react';
import { cn } from '../../../components/ui/utils';
import { REPORT_VIEWER_CONSTANTS } from '../config/report-viewer.constants';
import { REPORT_VIEWER_COPY } from '../config/report-viewer.copy.en';

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
  const { center, radius, sizePx, strokeWidth } = REPORT_VIEWER_CONSTANTS.scoreRing;
  const circumference = 2 * Math.PI * radius;

  return (
    <motion.div
      initial={{ opacity: 0, y: REPORT_VIEWER_CONSTANTS.motion.heroEnterOffsetY }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: REPORT_VIEWER_CONSTANTS.motion.heroEnterDurationSec,
        ease: REPORT_VIEWER_CONSTANTS.easing,
      }}
      className="relative overflow-hidden glc-orb-decor ds-report-hero-shell"
    >
      <div className="ds-report-hero-mesh pointer-events-none absolute inset-0" />
      <div className="relative flex items-start justify-between gap-6">
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
          {executiveSummary && (
            <p className="ds-report-hero-summary mt-4 leading-relaxed">
              {executiveSummary}
            </p>
          )}
          <div className="mt-5 flex flex-wrap gap-2">
            {[
              {
                icon: Warning,
                label: `${criticalIssueCount} ${REPORT_VIEWER_COPY.findings.criticalIssuesSuffix}`,
                iconClass: 'text-[color:var(--score-1)]',
              },
              {
                icon: Lightning,
                label: `${quickWinsCount} ${REPORT_VIEWER_COPY.findings.quickWinsSuffix}`,
                iconClass: 'text-[color:var(--glc-green)]',
              },
            ].map(({ icon: Icon, label, iconClass }) => (
              <div
                key={label}
                className="ds-report-hero-pill flex items-center gap-1.5 rounded-full px-3 py-1.5"
              >
                <Icon className={cn('h-3 w-3 shrink-0', iconClass)} />
                {label}
              </div>
            ))}
          </div>
        </div>

        <div className="ds-report-hero-score-panel flex shrink-0 flex-col items-center gap-2 rounded-2xl px-6 py-5">
          <svg width={sizePx} height={sizePx} className="shrink-0">
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
              stroke="var(--glc-blue)"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{
                strokeDashoffset:
                  circumference * (1 - averageScore / REPORT_VIEWER_CONSTANTS.scoreMax),
              }}
              transition={{ duration: 1, delay: 0.3, ease: REPORT_VIEWER_CONSTANTS.easing }}
              transform={`rotate(-90 ${center} ${center})`}
              className="ds-report-hero-ring-glow"
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
