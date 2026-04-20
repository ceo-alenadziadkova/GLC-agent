import { motion } from 'motion/react';
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
}: DomainScorecardProps) {
  return (
    <motion.div
      id={REPORT_VIEWER_CONSTANTS.roadmapCockpit.anchors.domainScorecard}
      variants={listVariants}
      initial="hidden"
      animate="visible"
      className="glc-card overflow-hidden ds-radius-xl"
    >
      <div className="ds-report-scorecard-head flex items-center justify-between px-5 py-3">
        <div className="flex items-center gap-2">
          <ChartBar className="w-4 h-4 ds-text-brand"  />
          <SectionLabel>{REPORT_VIEWER_COPY.sections.scorecard}</SectionLabel>
        </div>
        <span className="ds-report-scorecard-meta text-[length:var(--text-xs)]">
          {domainEntriesCount} {isFilteredProfile ? `of ${REPORT_VIEWER_CONSTANTS.totalDomainCount}` : ''}{' '}
          domains · avg {averageScore.toFixed(1)}/{REPORT_VIEWER_CONSTANTS.scoreMax}
        </span>
      </div>
      <div className="divide-y divide-[var(--border-subtle)]">
        {domains.map((domain, index) => (
          <motion.div
            key={domain.key}
            variants={itemVariants}
            className="ds-report-scorecard-row group flex items-center gap-4 px-5 py-3.5"
          >
            <span className="w-5 flex-shrink-0 tabular-nums font-mono text-xs text-[var(--text-quaternary)]">
              {String(index + 1).padStart(2, '0')}
            </span>
            <span className="ds-letterspace-tight-01 flex-1 text-sm font-medium text-[var(--text-primary)] font-[family-name:var(--font-display)]">
              {domain.label}
            </span>
            <div className="w-32">{domain.score > 0 && <ScoreBar score={domain.score} />}</div>
            {domain.score > 0 ? (
              <ScoreBadge score={domain.score} size="sm" />
            ) : (
              <span className="text-xs ds-text-quaternary" >
                —
              </span>
            )}
            <Link
              to={`/audit/${auditId}/${domain.key}`}
              className="glc-btn-icon h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
            >
              <CaretRight className="w-3.5 h-3.5" />
            </Link>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
