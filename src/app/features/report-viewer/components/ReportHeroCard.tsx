import { motion } from 'motion/react';
import { Lightning, Warning } from '@phosphor-icons/react';
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
      className="relative overflow-hidden glc-orb-decor"
      style={{
        background: 'var(--gradient-ink-rich)',
        borderRadius: 'var(--radius-2xl)',
        padding: '32px 36px',
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'var(--mesh-ink)', opacity: 0.7 }}
      />
      <div className="relative flex items-start justify-between gap-6">
        <div className="flex-1 min-w-0">
          <p className="glc-kicker" style={{ color: 'rgba(255,255,255,0.9)', borderColor: 'rgba(255,255,255,0.28)' }}>
            {REPORT_VIEWER_COPY.sections.executiveSummary}
          </p>
          <h2
            className="mt-2"
            style={{
              color: 'var(--primary-foreground)',
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-2xl)',
              fontWeight: 700,
              letterSpacing: 'var(--tracking-tight)',
              lineHeight: 1.2,
            }}
          >
            {companyName}
          </h2>
          <p className="mt-1" style={{ color: 'rgba(255,255,255,0.45)', fontSize: 'var(--text-sm)' }}>
            {industry || 'General'} ·{' '}
            {new Date(createdAt).toLocaleDateString(REPORT_VIEWER_CONSTANTS.dateLocale, {
              month: 'long',
              year: 'numeric',
            })}
          </p>
          {executiveSummary && (
            <p
              className="mt-4 leading-relaxed"
              style={{
                color: 'rgba(255,255,255,0.72)',
                fontSize: 'var(--text-sm)',
                maxWidth: REPORT_VIEWER_CONSTANTS.summaryPreviewMaxWidthPx,
              }}
            >
              {executiveSummary}
            </p>
          )}
          <div className="flex flex-wrap gap-2 mt-5">
            {[
              {
                icon: Warning,
                label: `${criticalIssueCount} ${REPORT_VIEWER_COPY.findings.criticalIssuesSuffix}`,
                color: 'var(--score-1)',
              },
              {
                icon: Lightning,
                label: `${quickWinsCount} ${REPORT_VIEWER_COPY.findings.quickWinsSuffix}`,
                color: 'var(--glc-green)',
              },
            ].map(({ icon: Icon, label, color }) => (
              <div
                key={label}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  fontSize: '11px',
                  color: 'rgba(255,255,255,0.80)',
                }}
              >
                <Icon className="w-3 h-3 flex-shrink-0" style={{ color }} />
                {label}
              </div>
            ))}
          </div>
        </div>

        <div
          className="flex-shrink-0 flex flex-col items-center gap-2 px-6 py-5 rounded-2xl"
          style={{
            backgroundColor: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.10)',
            backdropFilter: 'blur(12px)',
            minWidth: 120,
          }}
        >
          <svg width={sizePx} height={sizePx} style={{ flexShrink: 0 }}>
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke="rgba(255,255,255,0.10)"
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
              style={{ filter: 'drop-shadow(0 0 8px rgba(28,189,255,0.6))' }}
            />
            <text
              x={center}
              y={center + 4}
              textAnchor="middle"
              fontSize="20"
              fontWeight="700"
              fill="white"
              fontFamily="var(--font-mono)"
            >
              {averageScore.toFixed(1)}
            </text>
          </svg>
          <span
            style={{
              color: 'rgba(255,255,255,0.40)',
              fontSize: '10px',
              letterSpacing: '0.1em',
              fontWeight: 700,
              textTransform: 'uppercase',
            }}
          >
            {REPORT_VIEWER_COPY.sections.overall}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
