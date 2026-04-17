import { CaretRight } from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'motion/react';
import { QuickWinTag } from '../../../components/glc/QuickWinTag';
import { SectionLabel } from '../../../components/glc/SectionLabel';
import { AUDIT_WORKSPACE_COPY } from '../../../config/audit-workspace-copy.en';
import type { DomainData } from '../../../data/auditTypes';
import { AUDIT_WORKSPACE_UI } from '../config/ui';

type Props = {
  domainData: DomainData;
  openRec: number | null;
  setOpenRec: (value: number | null) => void;
};

export function RecommendationsSection({ domainData, openRec, setOpenRec }: Props) {
  if (domainData.recommendations.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <SectionLabel>{AUDIT_WORKSPACE_COPY.sections.recommendations}</SectionLabel>
        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          {domainData.recommendations.length} {AUDIT_WORKSPACE_COPY.sections.actionsSuffix}
        </span>
      </div>

      {domainData.recommendations.map((rec, index) => {
        const open = openRec === index;
        const isQuickWin = rec.priority === 'high' && rec.estimated_time;
        return (
          <div
            key={rec.id || index}
            className="glc-card overflow-hidden"
            style={{
              borderRadius: 'var(--radius-xl)',
              borderLeft: isQuickWin ? '3px solid var(--glc-orange)' : '3px solid var(--border-default)',
            }}
          >
            <button
              type="button"
              onClick={() => setOpenRec(open ? null : index)}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
              style={{ transition: 'background var(--ease-fast)' }}
              onMouseEnter={event => {
                event.currentTarget.style.backgroundColor = 'var(--bg-canvas)';
              }}
              onMouseLeave={event => {
                event.currentTarget.style.backgroundColor = '';
              }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="text-sm font-medium"
                    style={{
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-display)',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {rec.title}
                  </span>
                  {isQuickWin && <QuickWinTag time={rec.estimated_time} cost={rec.estimated_cost} />}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  <span>
                    {AUDIT_WORKSPACE_COPY.recommendation.priorityLabel}{' '}
                    <strong style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{rec.priority}</strong>
                  </span>
                  <span>
                    {AUDIT_WORKSPACE_COPY.recommendation.impactLabel}{' '}
                    <strong style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{rec.impact}</strong>
                  </span>
                  {rec.estimated_time && <span>{rec.estimated_time}</span>}
                </div>
              </div>
              <motion.div
                animate={{ rotate: open ? 90 : 0 }}
                transition={{ duration: AUDIT_WORKSPACE_UI.transitions.chevronRotateDuration }}
                className="flex-shrink-0"
              >
                <CaretRight className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
              </motion.div>
            </button>

            <AnimatePresence>
              {open && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{
                    duration: AUDIT_WORKSPACE_UI.transitions.expandDuration,
                    ease: AUDIT_WORKSPACE_UI.transitions.panelEase,
                  }}
                  style={{ overflow: 'hidden' }}
                >
                  <div
                    className="px-4 pb-4 pt-1 text-sm leading-relaxed"
                    style={{
                      color: 'var(--text-secondary)',
                      borderTop: '1px solid var(--border-subtle)',
                      backgroundColor: 'var(--bg-canvas)',
                    }}
                  >
                    <p className="pt-3">
                      {rec.description}
                      {rec.estimated_cost &&
                        ` ${AUDIT_WORKSPACE_COPY.recommendation.estimatedCostPrefix} ${rec.estimated_cost}.`}
                      {rec.estimated_time &&
                        ` ${AUDIT_WORKSPACE_COPY.recommendation.estimatedTimePrefix} ${rec.estimated_time}.`}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
