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
      variants={listVariants}
      initial="hidden"
      animate="visible"
      className="glc-card overflow-hidden"
      style={{ borderRadius: 'var(--radius-xl)' }}
    >
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-canvas)' }}
      >
        <div className="flex items-center gap-2">
          <ChartBar className="w-4 h-4" style={{ color: 'var(--glc-blue)' }} />
          <SectionLabel>{REPORT_VIEWER_COPY.sections.scorecard}</SectionLabel>
        </div>
        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
          {domainEntriesCount} {isFilteredProfile ? `of ${REPORT_VIEWER_CONSTANTS.totalDomainCount}` : ''}{' '}
          domains · avg {averageScore.toFixed(1)}/{REPORT_VIEWER_CONSTANTS.scoreMax}
        </span>
      </div>
      <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
        {domains.map((domain, index) => (
          <motion.div
            key={domain.key}
            variants={itemVariants}
            className="flex items-center gap-4 px-5 py-3.5 group"
            style={{ transition: 'background var(--ease-fast)' }}
            onMouseEnter={(event) => {
              (event.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-canvas)';
            }}
            onMouseLeave={(event) => {
              (event.currentTarget as HTMLElement).style.backgroundColor = '';
            }}
          >
            <span
              className="font-mono text-xs flex-shrink-0 tabular-nums"
              style={{ color: 'var(--text-quaternary)', width: 20 }}
            >
              {String(index + 1).padStart(2, '0')}
            </span>
            <span
              className="flex-1 font-medium text-sm"
              style={{
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-display)',
                letterSpacing: '-0.01em',
              }}
            >
              {domain.label}
            </span>
            <div className="w-32">{domain.score > 0 && <ScoreBar score={domain.score} />}</div>
            {domain.score > 0 ? (
              <ScoreBadge score={domain.score} size="sm" />
            ) : (
              <span className="text-xs" style={{ color: 'var(--text-quaternary)' }}>
                —
              </span>
            )}
            <Link
              to={`/audit/${auditId}/${domain.key}`}
              className="opacity-0 group-hover:opacity-100 transition-opacity glc-btn-icon"
              style={{ width: 26, height: 26 }}
            >
              <CaretRight className="w-3.5 h-3.5" />
            </Link>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
