import { CheckCircle, WarningCircle } from '@phosphor-icons/react';
import type { AuditDomain } from '../data/audit';
import { Surface } from './ui/surface';

interface StrengthsWeaknessesProps {
  domain: AuditDomain;
}

export function StrengthsWeaknesses({ domain }: StrengthsWeaknessesProps) {
  return (
    <section className="mb-12">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Strengths */}
        <div>
          <div className="mb-4 text-xs font-semibold tracking-wide text-[var(--text-tertiary)]">
            STRENGTHS
          </div>
          <Surface padding="lg" className="bg-[var(--surface-elevated)]">
            <div className="space-y-3">
              {domain.strengths.map((strength, index) => (
                <div key={index} className="flex gap-3">
                  <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-[var(--score-5)]" />
                  <p className="text-sm leading-relaxed text-[var(--text-primary)]">{strength}</p>
                </div>
              ))}
            </div>
          </Surface>
        </div>

        {/* Weaknesses */}
        <div>
          <div className="mb-4 text-xs font-semibold tracking-wide text-[var(--text-tertiary)]">
            WEAKNESSES
          </div>
          <Surface padding="lg" className="bg-[var(--surface-elevated)]">
            <div className="space-y-3">
              {domain.weaknesses.map((weakness, index) => (
                <div key={index} className="flex gap-3">
                  <WarningCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-[var(--score-2)]" />
                  <p className="text-sm leading-relaxed text-[var(--text-primary)]">{weakness}</p>
                </div>
              ))}
            </div>
          </Surface>
        </div>
      </div>
    </section>
  );
}