import type { CSSProperties } from 'react';
import { motion } from 'motion/react';
import { CheckCircle, Clock, Lightning, Warning } from '@phosphor-icons/react';
import { REPORT_VIEWER_LAYOUT } from '../../../../design-system/patterns/ReportViewer/layout';
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
      <div className={REPORT_VIEWER_LAYOUT.findingsGrid}>
        {[
          {
            title: REPORT_VIEWER_COPY.sections.keyStrengths,
            icon: CheckCircle,
            color: 'var(--glc-green)',
            bg: 'var(--score-5-bg)',
            border: 'var(--score-5-border)',
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
            className="ds-report-finding-well"
            style={
              {
                ['--ds-report-finding-bg' as string]: bg,
                ['--ds-report-finding-border' as string]: border,
                ['--ds-report-finding-accent' as string]: color,
              } as CSSProperties
            }
          >
            <div className="mb-3 flex items-center gap-2">
              <Icon className="h-4 w-4 flex-shrink-0 [color:var(--ds-report-finding-accent)]" />
              <span className="ds-report-finding-title">{title}</span>
            </div>
            <ul className="space-y-2">
              {items.length > 0 ? (
                items.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-xs leading-relaxed ds-text-secondary"
                  >
                    <span className="ds-report-finding-list-dot" aria-hidden />
                    {item}
                  </li>
                ))
              ) : (
                <li className="text-xs ds-text-quaternary" >
                  {REPORT_VIEWER_COPY.findings.noDataYet}
                </li>
              )}
            </ul>
          </motion.div>
        ))}
      </div>

      {quickWins.length > 0 && (
        <div className="glc-card overflow-hidden ds-radius-xl" >
          <div className="ds-report-quick-wins-header">
            <div className="flex items-center gap-2">
              <Lightning className="h-4 w-4 ds-icon-orange-fill" weight="fill" />
              <SectionLabel>{REPORT_VIEWER_COPY.sections.quickWins}</SectionLabel>
            </div>
          </div>
          <div className="divide-y divide-[color:var(--border-subtle)]">
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
                  <span className="ds-report-quick-win-index">
                    {index + 1}
                  </span>
                  <span className="flex-1 text-sm ds-text-primary" >
                    {quickWin.title}
                  </span>
                  {quickWin.timeframe && (
                    <span className="flex items-center gap-1 text-xs ds-text-tertiary" >
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
