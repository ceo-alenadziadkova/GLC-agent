import { CheckCircle, WarningCircle } from '@phosphor-icons/react';
import type { AuditDomain } from '../data/auditData';

interface StrengthsWeaknessesProps {
  domain: AuditDomain;
}

export function StrengthsWeaknesses({ domain }: StrengthsWeaknessesProps) {
  return (
    <section className="mb-12">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Strengths */}
        <div>
          <div className="text-xs font-semibold tracking-wide mb-4" style={{ color: 'var(--text-tertiary)' }}>
            STRENGTHS
          </div>
          <div 
            className="p-6 rounded-lg" 
            style={{ 
              backgroundColor: 'var(--surface-elevated)',
              border: '1px solid var(--panel-border)',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div className="space-y-3">
              {domain.strengths.map((strength, index) => (
                <div key={index} className="flex gap-3">
                  <CheckCircle
                    className="w-5 h-5 flex-shrink-0 mt-0.5"
                    style={{ color: 'var(--status-excellent)' }}
                  />
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                    {strength}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Weaknesses */}
        <div>
          <div className="text-xs font-semibold tracking-wide mb-4" style={{ color: 'var(--text-tertiary)' }}>
            WEAKNESSES
          </div>
          <div 
            className="p-6 rounded-lg" 
            style={{ 
              backgroundColor: 'var(--surface-elevated)',
              border: '1px solid var(--panel-border)',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div className="space-y-3">
              {domain.weaknesses.map((weakness, index) => (
                <div key={index} className="flex gap-3">
                  <WarningCircle
                    className="w-5 h-5 flex-shrink-0 mt-0.5"
                    style={{ color: 'var(--status-needs-improvement)' }}
                  />
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                    {weakness}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}