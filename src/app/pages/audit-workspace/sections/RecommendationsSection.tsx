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
        <span className="text-xs text-[var(--text-tertiary)]">
          {domainData.recommendations.length} {AUDIT_WORKSPACE_COPY.sections.actionsSuffix}
        </span>
      </div>

      {domainData.recommendations.map((rec, index) => {
        const open = openRec === index;
        const isQuickWin = rec.priority === 'high' && rec.estimated_time;
        return (
          <div
            key={rec.id || index}
            className={`glc-card overflow-hidden rounded-[var(--radius-xl)] border-l border-solid ds-rec-card-accent-border ${
              isQuickWin ? 'border-l-[var(--glc-orange)]' : 'border-l-[var(--border-default)]'
            }`}
          >
            <button
              type="button"
              onClick={() => setOpenRec(open ? null : index)}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-[background] duration-150 hover:bg-[var(--bg-canvas)]"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="text-sm font-medium [font-family:var(--font-display)] ds-letterspace-tight-01 text-[var(--text-primary)]"
                  >
                    {rec.title}
                  </span>
                  {isQuickWin && <QuickWinTag time={rec.estimated_time} cost={rec.estimated_cost} />}
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs text-[var(--text-tertiary)]">
                  <span>
                    {AUDIT_WORKSPACE_COPY.recommendation.priorityLabel}{' '}
                    <strong className="font-medium text-[var(--text-secondary)]">{rec.priority}</strong>
                  </span>
                  <span>
                    {AUDIT_WORKSPACE_COPY.recommendation.impactLabel}{' '}
                    <strong className="font-medium text-[var(--text-secondary)]">{rec.impact}</strong>
                  </span>
                  {rec.estimated_time && <span>{rec.estimated_time}</span>}
                </div>
              </div>
              <motion.div
                animate={{ rotate: open ? 90 : 0 }}
                transition={{ duration: AUDIT_WORKSPACE_UI.transitions.chevronRotateDuration }}
                className="flex-shrink-0"
              >
                <CaretRight className="h-4 w-4 text-[var(--text-tertiary)]" />
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
                  className="overflow-hidden"
                >
                  <div
                    className="border-t border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-4 pb-4 pt-1 text-sm leading-relaxed text-[var(--text-secondary)]"
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
