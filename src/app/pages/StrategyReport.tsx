import { motion } from 'motion/react';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { StrategyRoadmap } from '../components/StrategyRoadmap';
import { strategyRoadmap } from '../data/auditData';
import { Target, TrendingUp, AlertCircle } from 'lucide-react';

export function StrategyReport() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="h-full"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      <div className="max-w-5xl mx-auto px-12 py-12">
        {/* Breadcrumbs */}
        <Breadcrumbs
          items={[
            { label: 'Audit Overview', href: '/audit/overview' },
            { label: 'Strategy & Roadmap' }
          ]}
        />

        {/* Header */}
        <section className="mb-12">
          <div className="text-xs font-semibold tracking-wide mb-2" style={{ color: 'var(--text-tertiary)' }}>
            STRATEGIC PLANNING
          </div>
          <h1 className="text-3xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Implementation Roadmap
          </h1>
          <p className="text-base leading-relaxed max-w-3xl" style={{ color: 'var(--text-secondary)' }}>
            This strategic roadmap prioritizes initiatives based on business impact, implementation effort, 
            and technical dependencies. Execute quick wins immediately while planning for medium and long-term 
            transformational initiatives.
          </p>
        </section>

        {/* Summary Cards */}
        <section className="mb-12">
          <div className="grid md:grid-cols-3 gap-6">
            <div
              className="p-6 rounded-lg"
              style={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--panel-border)',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg" style={{ backgroundColor: '#F0FDF4' }}>
                  <Target className="w-5 h-5" style={{ color: 'var(--status-excellent)' }} />
                </div>
                <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Total Initiatives
                </h3>
              </div>
              <div className="text-3xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                {strategyRoadmap.length}
              </div>
            </div>

            <div
              className="p-6 rounded-lg"
              style={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--panel-border)',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg" style={{ backgroundColor: '#FFF7ED' }}>
                  <TrendingUp className="w-5 h-5" style={{ color: 'var(--status-needs-improvement)' }} />
                </div>
                <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                  High Impact
                </h3>
              </div>
              <div className="text-3xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                {strategyRoadmap.filter(i => i.impact === 'high').length}
              </div>
            </div>

            <div
              className="p-6 rounded-lg"
              style={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--panel-border)',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg" style={{ backgroundColor: '#EFF6FF' }}>
                  <AlertCircle className="w-5 h-5" style={{ color: '#3B82F6' }} />
                </div>
                <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Quick Wins
                </h3>
              </div>
              <div className="text-3xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                {strategyRoadmap.filter(i => i.timeframe === 'quick-win').length}
              </div>
            </div>
          </div>
        </section>

        {/* Roadmap */}
        <StrategyRoadmap initiatives={strategyRoadmap} />

        {/* Implementation Guidelines */}
        <section className="mb-12">
          <div className="text-xs font-semibold tracking-wide mb-4" style={{ color: 'var(--text-tertiary)' }}>
            IMPLEMENTATION GUIDELINES
          </div>
          <div
            className="p-6 rounded-lg"
            style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--panel-border)',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              Execution Framework
            </h3>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                  Phase 1: Quick Wins (Week 1)
                </h4>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  Execute all quick win initiatives immediately. These require minimal resources and deliver 
                  rapid value, building momentum and stakeholder confidence.
                </p>
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                  Phase 2: Medium Term (Month 1)
                </h4>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  Begin planning and resource allocation for medium-term initiatives. These projects require 
                  cross-functional coordination and moderate investment.
                </p>
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                  Phase 3: Strategic Initiatives (Months 1-3)
                </h4>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  Launch transformational initiatives with significant business impact. Monitor progress closely 
                  and adjust strategy based on market conditions and early results.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </motion.div>
  );
}