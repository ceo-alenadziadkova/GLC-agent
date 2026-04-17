import { motion } from 'motion/react';
import { CheckCircle, Clock, Lightning, Warning } from '@phosphor-icons/react';
import { SectionLabel } from '../../../components/glc/SectionLabel';
import type { AuditIssue, QuickWin } from '../../../data/auditTypes';
import { REPORT_VIEWER_CONSTANTS } from '../config/report-viewer.constants';
import { REPORT_VIEWER_COPY } from '../config/report-viewer.copy.en';
import type { ReportStrengthViewModel } from '../domain/types';

type ReportFindingsProps = {
  strengths: ReportStrengthViewModel[];
  criticalIssues: AuditIssue[];
  quickWins: QuickWin[];
  maxItems: number;
};

export function ReportFindings({
  strengths,
  criticalIssues,
  quickWins,
  maxItems,
}: ReportFindingsProps) {
  const strengthItems = strengths
    .slice(0, Math.min(REPORT_VIEWER_CONSTANTS.findings.maxPinnedItems, maxItems))
    .map((strength) => strength.text);
  const issueItems = criticalIssues
    .slice(0, Math.min(REPORT_VIEWER_CONSTANTS.findings.maxPinnedItems, maxItems))
    .map((issue) => issue.title);

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {[
          {
            title: REPORT_VIEWER_COPY.sections.keyStrengths,
            icon: CheckCircle,
            color: 'var(--glc-green)',
            bg: 'var(--glc-green-xlight)',
            border: 'rgba(14,207,130,0.20)',
            items: strengthItems,
          },
          {
            title: REPORT_VIEWER_COPY.sections.criticalIssues,
            icon: Warning,
            color: 'var(--score-1)',
            bg: 'var(--score-1-bg)',
            border: 'var(--score-1-border)',
            items: issueItems,
          },
        ].map(({ title, icon: Icon, color, bg, border, items }) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: REPORT_VIEWER_CONSTANTS.motion.cardEnterOffsetY }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.2,
              duration: REPORT_VIEWER_CONSTANTS.motion.cardEnterDurationSec,
              ease: REPORT_VIEWER_CONSTANTS.easing,
            }}
            className="p-5"
            style={{
              backgroundColor: bg,
              border: `1px solid ${border}`,
              borderRadius: 'var(--radius-xl)',
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Icon className="w-4 h-4 flex-shrink-0" style={{ color }} />
              <span className="font-semibold text-sm" style={{ color, fontFamily: 'var(--font-display)' }}>
                {title}
              </span>
            </div>
            <ul className="space-y-2">
              {items.length > 0 ? (
                items.map((item) => (
                  <li
                    key={item}
                    className="text-xs leading-relaxed flex items-start gap-2"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <span
                      className="mt-1.5 w-1 h-1 rounded-full flex-shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    {item}
                  </li>
                ))
              ) : (
                <li className="text-xs" style={{ color: 'var(--text-quaternary)' }}>
                  {REPORT_VIEWER_COPY.findings.noDataYet}
                </li>
              )}
            </ul>
          </motion.div>
        ))}
      </div>

      {quickWins.length > 0 && (
        <div className="glc-card overflow-hidden" style={{ borderRadius: 'var(--radius-xl)' }}>
          <div
            className="flex items-center justify-between px-5 py-3"
            style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-canvas)' }}
          >
            <div className="flex items-center gap-2">
              <Lightning
                className="w-4 h-4"
                style={{ color: 'var(--glc-orange)', fill: 'var(--glc-orange)', stroke: 'none' }}
              />
              <SectionLabel>{REPORT_VIEWER_COPY.sections.quickWins}</SectionLabel>
            </div>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
            {quickWins
              .slice(0, Math.min(REPORT_VIEWER_CONSTANTS.quickWins.maxItems, maxItems))
              .map((quickWin, index) => (
                <motion.div
                  key={quickWin.id || index}
                  initial={{ opacity: 0, x: REPORT_VIEWER_CONSTANTS.motion.quickWinEnterOffsetX }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    delay:
                      index * REPORT_VIEWER_CONSTANTS.motion.quickWinStaggerDelaySec +
                      REPORT_VIEWER_CONSTANTS.motion.quickWinDelayStartSec,
                    duration: REPORT_VIEWER_CONSTANTS.motion.quickWinEnterDurationSec,
                    ease: REPORT_VIEWER_CONSTANTS.easing,
                  }}
                  className="flex items-center gap-4 px-5 py-3.5"
                >
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 font-mono text-xs font-bold"
                    style={{
                      backgroundColor: 'var(--glc-orange-xlight)',
                      color: 'var(--glc-orange)',
                      fontSize: '10px',
                    }}
                  >
                    {index + 1}
                  </span>
                  <span className="flex-1 text-sm" style={{ color: 'var(--text-primary)' }}>
                    {quickWin.title}
                  </span>
                  {quickWin.timeframe && (
                    <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      <Clock className="w-3 h-3" />
                      {quickWin.timeframe}
                    </span>
                  )}
                </motion.div>
              ))}
          </div>
        </div>
      )}
    </>
  );
}
