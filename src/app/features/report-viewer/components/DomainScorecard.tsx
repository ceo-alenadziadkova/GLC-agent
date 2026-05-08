import { motion, useReducedMotion } from 'motion/react';
import { CaretRight, ChartBar } from '@phosphor-icons/react';
import { Link } from 'react-router';
import { ScoreBadge, ScoreBar } from '../../../components/glc/ScoreBadge';
import { SectionLabel } from '../../../components/glc/SectionLabel';
import { REPORT_VIEWER_CONSTANTS } from '../config/report-viewer.constants';
import { REPORT_VIEWER_COPY } from '../config/report-viewer.copy.en';
import type { ReportDomainViewModel } from '../domain/types';

type DomainScorecardProps = {
  auditId: string;
  domains: ReportDomainViewModel[];
  domainEntriesCount: number;
  isFilteredProfile: boolean;
  averageScore: number;
  buildDomainHref: (auditId: string, domainKey: string) => string;
};

const listVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: REPORT_VIEWER_CONSTANTS.list.staggerChildrenSec },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: REPORT_VIEWER_CONSTANTS.list.itemEnterOffsetY },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: REPORT_VIEWER_CONSTANTS.list.itemEnterDurationSec,
      ease: REPORT_VIEWER_CONSTANTS.easing,
    },
  },
};

export function DomainScorecard({
  auditId,
  domains,
  domainEntriesCount,
  isFilteredProfile,
  averageScore,
  buildDomainHref,
}: DomainScorecardProps) {
  const shouldReduceMotion = useReducedMotion();
  return (
    <motion.div
      id={REPORT_VIEWER_CONSTANTS.roadmapCockpit.anchors.domainScorecard}
      variants={listVariants}
      initial={shouldReduceMotion ? false : 'hidden'}
      animate="visible"
      className="glc-card overflow-hidden ds-radius-xl"
    >
      <div className="ds-report-scorecard-head flex flex-col items-start gap-1.5 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <ChartBar className="w-4 h-4 ds-text-brand"  />
          <SectionLabel>{REPORT_VIEWER_COPY.sections.scorecard}</SectionLabel>
        </div>
        <span className="ds-report-scorecard-meta text-[length:var(--text-xs)] break-words sm:text-right">
          {domainEntriesCount} {isFilteredProfile ? `of ${REPORT_VIEWER_CONSTANTS.totalDomainCount}` : ''}{' '}
          domains · avg {averageScore.toFixed(1)}/{REPORT_VIEWER_CONSTANTS.scoreMax}
        </span>
      </div>
      <div className="divide-y divide-[var(--border-subtle)]">
        {domains.map((domain, index) => (
          <motion.div
            key={domain.key}
            variants={itemVariants}
            transition={shouldReduceMotion ? { duration: 0 } : undefined}
            className="ds-report-scorecard-row group grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-3 md:flex md:items-center md:gap-4 md:px-5 md:py-3.5"
          >
            <span className="w-5 flex-shrink-0 tabular-nums font-mono text-xs text-[var(--text-quaternary)]">
              {String(index + 1).padStart(2, '0')}
            </span>
            <span className="ds-letterspace-tight-01 min-w-0 text-sm font-medium text-[var(--text-primary)] font-[family-name:var(--font-display)] md:flex-1">
              {domain.label}
            </span>
            <div className="col-span-2 min-w-0 pr-1 md:col-span-1 md:w-28 md:pr-0 lg:w-32">
              {domain.score > 0 && <ScoreBar score={domain.score} />}
            </div>
            <div className="justify-self-end md:justify-self-auto">
              {domain.score > 0 ? (
                <ScoreBadge score={domain.score} size="sm" />
              ) : (
                <span className="text-xs ds-text-quaternary" >
                  —
                </span>
              )}
            </div>
            <Link
              to={buildDomainHref(auditId, domain.key)}
              aria-label={`Open ${domain.label} details`}
              className="glc-btn-icon h-11 w-11 md:h-9 md:w-9 justify-self-end md:justify-self-auto group-hover:bg-[var(--surface-hover)] group-focus-within:bg-[var(--surface-hover)]"
            >
              <CaretRight className="w-3.5 h-3.5" />
            </Link>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
