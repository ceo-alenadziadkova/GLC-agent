import { motion } from 'motion/react';
import { Link } from 'react-router';
import { ArrowRight, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { ScoreIndicator } from '../components/ScoreIndicator';
import { auditDomains } from '../data/auditData';
import { 
  Search, Server, Shield, Globe, MousePointer, 
  Target, Zap, Map, type LucideIcon 
} from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  Search,
  Server,
  Shield,
  Globe,
  MousePointer,
  Target,
  Zap,
  Map
};

export function OverviewReport() {
  const averageScore = Math.round(
    auditDomains.reduce((sum, domain) => sum + domain.score, 0) / auditDomains.length * 10
  ) / 10;

  const criticalIssuesCount = auditDomains.reduce(
    (sum, domain) => sum + domain.issues.filter(i => i.severity === 'critical').length,
    0
  );

  const totalRecommendations = auditDomains.reduce(
    (sum, domain) => sum + domain.recommendations.length,
    0
  );

  const totalQuickWins = auditDomains.reduce(
    (sum, domain) => sum + domain.quickWins.length,
    0
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="h-full"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      <div className="max-w-6xl mx-auto px-12 py-12">
        {/* Header */}
        <section className="mb-12">
          <div className="text-xs font-semibold tracking-wide mb-2" style={{ color: 'var(--text-tertiary)' }}>
            EXECUTIVE OVERVIEW
          </div>
          <h1 className="text-3xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Complete Audit Summary
          </h1>
          <p className="text-base leading-relaxed max-w-3xl" style={{ color: 'var(--text-secondary)' }}>
            Comprehensive analysis across {auditDomains.length} critical business domains. This overview provides 
            strategic insights into organizational health, technical capabilities, and growth opportunities.
          </p>
        </section>

        {/* Key Metrics */}
        <section className="mb-12">
          <div className="grid md:grid-cols-4 gap-6">
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
                  <TrendingUp className="w-5 h-5" style={{ color: 'var(--status-excellent)' }} />
                </div>
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Average Score
                </h3>
              </div>
              <div className="text-3xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                {averageScore}/5
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
                <div className="p-2 rounded-lg" style={{ backgroundColor: '#FFF1F0' }}>
                  <AlertTriangle className="w-5 h-5" style={{ color: 'var(--status-critical)' }} />
                </div>
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Critical Issues
                </h3>
              </div>
              <div className="text-3xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                {criticalIssuesCount}
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
                  <CheckCircle2 className="w-5 h-5" style={{ color: '#3B82F6' }} />
                </div>
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Recommendations
                </h3>
              </div>
              <div className="text-3xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                {totalRecommendations}
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
                <div className="p-2 rounded-lg" style={{ backgroundColor: '#F0FDF4' }}>
                  <Zap className="w-5 h-5" style={{ color: 'var(--status-excellent)' }} />
                </div>
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Quick Wins
                </h3>
              </div>
              <div className="text-3xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                {totalQuickWins}
              </div>
            </div>
          </div>
        </section>

        {/* Domain Cards */}
        <section className="mb-12">
          <div className="text-xs font-semibold tracking-wide mb-4" style={{ color: 'var(--text-tertiary)' }}>
            AUDIT DOMAINS
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {auditDomains.map((domain, index) => {
              const Icon = iconMap[domain.icon];
              
              return (
                <motion.div
                  key={domain.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link
                    to={`/audit/${domain.id}`}
                    className="block p-6 rounded-lg border bg-white hover:shadow-md transition-all group"
                    style={{ borderColor: 'var(--panel-border)', boxShadow: 'var(--shadow-sm)' }}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="p-2 rounded-lg"
                          style={{ backgroundColor: 'var(--surface)' }}
                        >
                          <Icon className="w-5 h-5" style={{ color: 'var(--text-primary)' }} />
                        </div>
                        <div>
                          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {domain.name}
                          </h3>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <ScoreIndicator score={domain.score} size="sm" />
                        <ArrowRight 
                          className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" 
                          style={{ color: 'var(--text-tertiary)' }}
                        />
                      </div>
                    </div>

                    <p className="text-sm mb-4 leading-relaxed line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                      {domain.executiveSummary}
                    </p>

                    <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{domain.strengths.length} strengths</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>{domain.issues.length} issues</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5" />
                        <span>{domain.quickWins.length} quick wins</span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* CTA */}
        <section className="mb-12">
          <div
            className="p-8 rounded-lg text-center"
            style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--panel-border)',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <h3 className="text-xl font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
              Ready to take action?
            </h3>
            <p className="text-sm mb-6 max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
              Review the complete strategic roadmap to prioritize initiatives and begin implementation.
            </p>
            <Link
              to="/audit/strategy"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all"
              style={{
                backgroundColor: 'var(--text-primary)',
                color: 'white'
              }}
            >
              View Strategic Roadmap
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </div>
    </motion.div>
  );
}
