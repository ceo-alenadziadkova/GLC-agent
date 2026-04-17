import { motion } from 'motion/react';
import { ScoreBar } from '../../../components/glc/ScoreBadge';
import { SectionLabel } from '../../../components/glc/SectionLabel';
import { AUDIT_WORKSPACE_COPY } from '../../../config/audit-workspace-copy.en';
import { DOMAIN_LABELS, type AuditState, type DomainKey } from '../../../data/auditTypes';
import { DOMAIN_ICONS } from '../config/presentation';
import { AUDIT_WORKSPACE_UI } from '../config/ui';

type Props = {
  audit: AuditState;
  visibleDomainKeys: readonly DomainKey[];
  activeDomain: DomainKey;
  setActiveDomain: (value: DomainKey) => void;
  resetOpenRecommendation: () => void;
};

export function DomainNav({
  audit,
  visibleDomainKeys,
  activeDomain,
  setActiveDomain,
  resetOpenRecommendation,
}: Props) {
  return (
    <div className="px-2 py-2 space-y-0.5 flex-1">
      <div className="px-2 pb-1.5">
        <SectionLabel>{AUDIT_WORKSPACE_COPY.sidebar.domains}</SectionLabel>
      </div>
      {visibleDomainKeys.map(key => {
        const Icon = DOMAIN_ICONS[key];
        const domain = audit.domains[key];
        const active = key === activeDomain;
        const score = domain?.score ?? 0;

        return (
          <motion.button
            key={key}
            onClick={() => {
              setActiveDomain(key);
              resetOpenRecommendation();
            }}
            whileHover={{ x: 1 }}
            transition={{ duration: AUDIT_WORKSPACE_UI.transitions.hoverSlideDuration }}
            className={`relative flex w-full items-center gap-2.5 rounded-xl border px-2.5 py-2.5 text-left transition-all duration-150 ${
              active
                ? 'border-[rgba(28,189,255,0.22)] bg-[var(--glc-blue-xlight)]'
                : 'border-transparent bg-transparent hover:bg-[var(--bg-canvas)]'
            }`}
          >
            <Icon
              className={`h-4 w-4 shrink-0 ${active ? 'text-[var(--glc-blue)]' : 'text-[var(--text-tertiary)]'}`}
            />
            <div className="flex-1 min-w-0">
              <div className={`truncate text-xs font-medium ${active ? 'text-[var(--glc-blue-deeper)]' : 'text-[var(--text-secondary)]'}`}>
                {DOMAIN_LABELS[key]}
              </div>
              {score > 0 && (
                <div className="mt-0.5">
                  <ScoreBar score={score} />
                </div>
              )}
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
