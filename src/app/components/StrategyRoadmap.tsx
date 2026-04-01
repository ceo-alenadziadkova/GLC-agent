import { motion } from 'motion/react';
import { ArrowRight, TrendUp, Lightning, Calendar, Target } from '@phosphor-icons/react';
import type { StrategyInitiative } from '../data/auditData';
import { cn } from './ui/utils';

interface StrategyRoadmapProps {
  initiatives: StrategyInitiative[];
}

interface InitiativeCardProps {
  initiative: StrategyInitiative;
  index: number;
}

function InitiativeCard({ initiative, index }: InitiativeCardProps) {
  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'var(--status-excellent)';
      case 'medium':
        return 'var(--status-moderate)';
      default:
        return 'var(--text-secondary)';
    }
  };

  const getEffortColor = (effort: string) => {
    switch (effort) {
      case 'low':
        return 'var(--score-5)';
      case 'medium':
        return 'var(--score-3)';
      default:
        return 'var(--score-1)';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="p-5 rounded-lg border bg-[var(--bg-surface)] hover:shadow-md transition-all"
      style={{ borderColor: 'var(--panel-border)', boxShadow: 'var(--shadow-sm)' }}
    >
      <div className="flex items-start justify-between mb-3">
        <h4 className="font-semibold text-sm flex-1" style={{ color: 'var(--text-primary)' }}>
          {initiative.title}
        </h4>
      </div>

      <p className="text-sm mb-4 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        {initiative.description}
      </p>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <TrendUp className="w-3.5 h-3.5" style={{ color: getImpactColor(initiative.impact) }} />
          <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            {initiative.impact} impact
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Lightning className="w-3.5 h-3.5" style={{ color: getEffortColor(initiative.effort) }} />
          <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            {initiative.effort} effort
          </span>
        </div>
      </div>

      {initiative.dependencies && initiative.dependencies.length > 0 && (
        <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--panel-border)' }}>
          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            Dependencies: {initiative.dependencies.join(', ')}
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
    color,
    timeLabel 
  }: { 
    title: string; 
    icon: any; 
    items: StrategyInitiative[]; 
    color: string;
    timeLabel: string;
  }) => (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <div
          className="p-2 rounded-lg"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <div>
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            {title}
          </h3>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {timeLabel}
          </p>
        </div>
      </div>

      {items.length > 0 ? (
        <div className="grid gap-4">
          {items.map((initiative, index) => (
            <InitiativeCard key={initiative.id} initiative={initiative} index={index} />
          ))}
        </div>
      ) : (
        <div className="text-sm py-4" style={{ color: 'var(--text-tertiary)' }}>
          No initiatives in this timeframe
        </div>
      )}
    </div>
  );

  return (
    <section className="mb-12">
      <div className="text-xs font-semibold tracking-wide mb-2" style={{ color: 'var(--text-tertiary)' }}>
        STRATEGIC ROADMAP
      </div>
      <h2 className="text-2xl font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>
        Implementation Timeline
      </h2>

      <div className="space-y-6">
        <TimeframeSection
          title="Quick Wins"
          icon={Lightning}
          items={quickWins}
          color="var(--status-excellent)"
          timeLabel="≤ 1 week"
        />

        <TimeframeSection
          title="Medium Term"
          icon={Calendar}
          items={mediumTerm}
          color="var(--status-moderate)"
          timeLabel="≈ 1 month"
        />

        <TimeframeSection
          title="Strategic Initiatives"
          icon={Target}
          items={strategic}
          color="#3B82F6"
          timeLabel="1-3 months"
        />
      </div>
    </section>
  );
}
