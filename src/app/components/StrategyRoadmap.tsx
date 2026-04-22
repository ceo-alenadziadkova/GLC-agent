import type { ComponentType } from 'react';
import { motion } from 'motion/react';
import { TrendUp, Lightning, Calendar, Target } from '@phosphor-icons/react';
import type { StrategyInitiative } from '../data/audit';
import { getEffortTone, getImpactTone } from '../design-system/tokens/report-semantic-tokens';
import { ORCHESTRATION_UI_COPY } from '../config/orchestration-roadmap-ui-copy.en';

interface StrategyRoadmapProps {
  initiatives: StrategyInitiative[];
}

interface InitiativeCardProps {
  initiative: StrategyInitiative;
  index: number;
}

function InitiativeCard({ initiative, index }: InitiativeCardProps) {
  const impactTone = getImpactTone(initiative.impact);
  const effortTone = getEffortTone(initiative.effort);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="rounded-lg border border-[var(--panel-border)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-sm)] transition-all hover:shadow-[var(--shadow-md)]"
    >
      <div className="flex items-start justify-between mb-3">
        <h4 className="flex-1 text-sm font-semibold text-[var(--text-primary)]">
          {initiative.title}
        </h4>
      </div>

      <p className="mb-4 text-sm leading-relaxed text-[var(--text-secondary)]">
        {initiative.description}
      </p>
      {initiative.outcome ? (
        <div className="mb-4 rounded-md border border-[var(--panel-border)] bg-[var(--bg-muted)] px-3 py-2 text-xs text-[var(--text-secondary)]">
          <span className="font-medium text-[var(--text-primary)]">{ORCHESTRATION_UI_COPY.initiativeOutcomeLabel}: </span>
          {initiative.outcome.description}
          {initiative.outcome.timeframe ? ` (${initiative.outcome.timeframe})` : ''}
        </div>
      ) : null}

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <TrendUp className={`h-3.5 w-3.5 ${impactTone.iconClassName}`} />
          <span className="text-xs font-medium text-[var(--text-secondary)]">
            {impactTone.label}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Lightning className={`h-3.5 w-3.5 ${effortTone.iconClassName}`} />
          <span className="text-xs font-medium text-[var(--text-secondary)]">
            {effortTone.label}
          </span>
        </div>
      </div>

      {initiative.dependencies && initiative.dependencies.length > 0 && (
        <div className="mt-3 border-t border-[var(--panel-border)] pt-3">
          <span className="text-xs text-[var(--text-tertiary)]">
            {ORCHESTRATION_UI_COPY.strategyRoadmapDependenciesLabel}: {initiative.dependencies.join(', ')}
          </span>
        </div>
      )}
    </motion.div>
  );
}

export function StrategyRoadmap({ initiatives }: StrategyRoadmapProps) {
  const quickWins = initiatives.filter(i => i.timeframe === 'quick-win');
  const mediumTerm = initiatives.filter(i => i.timeframe === 'medium-term');
  const strategic = initiatives.filter(i => i.timeframe === 'strategic');

  const TimeframeSection = ({ 
    title, 
    icon: Icon, 
    items,
    iconClassName,
    iconBgClassName,
    timeLabel 
  }: { 
    title: string; 
    icon: ComponentType<{ className?: string }>;
    items: StrategyInitiative[]; 
    iconClassName: string;
    iconBgClassName: string;
    timeLabel: string;
  }) => (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <div className={`rounded-lg p-2 ${iconBgClassName}`}>
          <Icon className={`h-5 w-5 ${iconClassName}`} />
        </div>
        <div>
          <h3 className="font-semibold text-[var(--text-primary)]">{title}</h3>
          <p className="text-xs text-[var(--text-tertiary)]">{timeLabel}</p>
        </div>
      </div>

      {items.length > 0 ? (
        <div className="grid gap-4">
          {items.map((initiative, index) => (
            <InitiativeCard key={initiative.id} initiative={initiative} index={index} />
          ))}
        </div>
      ) : (
        <div className="py-4 text-sm text-[var(--text-tertiary)]">{ORCHESTRATION_UI_COPY.strategyRoadmapEmptyTimeframe}</div>
      )}
    </div>
  );

  return (
    <section className="mb-12">
      <div className="mb-2 text-xs font-semibold tracking-wide text-[var(--text-tertiary)]">{ORCHESTRATION_UI_COPY.strategyRoadmapEyebrow}</div>
      <h2 className="mb-6 text-2xl font-semibold text-[var(--text-primary)]">{ORCHESTRATION_UI_COPY.strategyRoadmapTitle}</h2>

      <div className="space-y-6">
        <TimeframeSection
          title={ORCHESTRATION_UI_COPY.strategyRoadmapQuickWinsTitle}
          icon={Lightning}
          items={quickWins}
          iconClassName="text-[var(--score-5)]"
          iconBgClassName="bg-[var(--score-5-bg)]"
          timeLabel={ORCHESTRATION_UI_COPY.strategyRoadmapQuickWinsWindow}
        />

        <TimeframeSection
          title={ORCHESTRATION_UI_COPY.strategyRoadmapMediumTermTitle}
          icon={Calendar}
          items={mediumTerm}
          iconClassName="text-[var(--score-3)]"
          iconBgClassName="bg-[var(--score-3-bg)]"
          timeLabel={ORCHESTRATION_UI_COPY.strategyRoadmapMediumTermWindow}
        />

        <TimeframeSection
          title={ORCHESTRATION_UI_COPY.strategyRoadmapStrategicTitle}
          icon={Target}
          items={strategic}
          iconClassName="text-[var(--glc-blue)]"
          iconBgClassName="bg-[var(--glc-blue-muted)]"
          timeLabel={ORCHESTRATION_UI_COPY.strategyRoadmapStrategicWindow}
        />
      </div>
    </section>
  );
}
