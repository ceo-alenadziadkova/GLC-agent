import { useParams, Navigate } from 'react-router';
import { motion } from 'motion/react';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { ExecutiveSummary } from '../components/ExecutiveSummary';
import { ScorecardOverview } from '../components/ScorecardOverview';
import { StrengthsWeaknesses } from '../components/StrengthsWeaknesses';
import { IssuesTable } from '../components/IssuesTable';
import { RecommendationCard } from '../components/RecommendationCard';
import { QuickWinCard } from '../components/QuickWinCard';
import { CollapsibleSection } from '../components/CollapsibleSection';
import { auditDomains } from '../data/auditData';

export function DomainReport() {
  const { domainId } = useParams();
  const domain = auditDomains.find(d => d.id === domainId);

  if (!domain) {
    return <Navigate to="/audit/recon" replace />;
  }

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
            { label: domain.name }
          ]}
        />
        
        {/* Executive Summary */}
        <ExecutiveSummary domain={domain} />

        {/* Scorecard Overview */}
        <ScorecardOverview domain={domain} />

        {/* Strengths & Weaknesses */}
        <StrengthsWeaknesses domain={domain} />

        {/* Issues Table */}
        <section className="mb-12">
          <div className="text-xs font-semibold tracking-wide mb-4" style={{ color: 'var(--text-tertiary)' }}>
            CRITICAL ISSUES
          </div>
          <IssuesTable issues={domain.issues} />
        </section>

        {/* Recommendations */}
        <CollapsibleSection
          title="STRATEGIC RECOMMENDATIONS"
          headerExtra={
            <span 
              className="text-xs font-medium px-3 py-1 rounded-full"
              style={{ 
                backgroundColor: 'var(--surface)', 
                color: 'var(--text-secondary)' 
              }}
            >
              {domain.recommendations.length} items
            </span>
          }
        >
          <div className="grid gap-4">
            {domain.recommendations.map((recommendation) => (
              <RecommendationCard key={recommendation.id} recommendation={recommendation} />
            ))}
          </div>
        </CollapsibleSection>

        {/* Quick Wins */}
        <section className="mb-12">
          <div className="text-xs font-semibold tracking-wide mb-2" style={{ color: 'var(--text-tertiary)' }}>
            QUICK WINS
          </div>
          <h3 className="text-xl font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>
            Immediate Action Items
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            {domain.quickWins.map((quickWin) => (
              <QuickWinCard key={quickWin.id} quickWin={quickWin} />
            ))}
          </div>
        </section>

        {/* Estimated Investment */}
        <section className="mb-12">
          <div className="text-xs font-semibold tracking-wide mb-4" style={{ color: 'var(--text-tertiary)' }}>
            ESTIMATED INVESTMENT
          </div>
          <div
            className="p-6 rounded-lg"
            style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--panel-border)',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <div className="text-xs mb-2" style={{ color: 'var(--text-tertiary)' }}>
                  Immediate (Quick Wins)
                </div>
                <div className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {domain.estimatedInvestment.immediate}
                </div>
              </div>
              <div>
                <div className="text-xs mb-2" style={{ color: 'var(--text-tertiary)' }}>
                  Short Term (1-3 months)
                </div>
                <div className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {domain.estimatedInvestment.shortTerm}
                </div>
              </div>
              <div>
                <div className="text-xs mb-2" style={{ color: 'var(--text-tertiary)' }}>
                  Long Term (3-12 months)
                </div>
                <div className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {domain.estimatedInvestment.longTerm}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </motion.div>
  );
}