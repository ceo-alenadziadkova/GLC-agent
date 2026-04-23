import { useMemo } from 'react';
import {
  getIntakeIntelligenceContract,
  QUESTION_BANK_V1_IDS,
} from '@glc/intake-core';
import caseCatalog from '@glc/intake-core/intake-case-patterns.v1.json';

type CaseRow = (typeof caseCatalog)['cases'][number];

/**
 * Read-only view of question→signal, question→decision target, and case-overlay edges from repo artifacts.
 */
export function StudioDependencyGraphSection() {
  const { signalRows, impactRows, caseRows } = useMemo(() => {
    const signalRows: string[] = [];
    const impactRows: string[] = [];
    for (const id of Array.from(QUESTION_BANK_V1_IDS).sort((a, b) => a.localeCompare(b))) {
      const c = getIntakeIntelligenceContract(id);
      for (const sc of c.signalContribution ?? []) {
        if (sc?.signalKey) {
          signalRows.push(`${id}  →  signal:${sc.signalKey}  (+${String(sc.expectedInfoGainBits ?? '')} bit)`);
        }
      }
      for (const di of c.decisionImpact ?? []) {
        if (di?.target) {
          impactRows.push(
            `${id}  →  impact:${di.target}  (${di.weight})`,
          );
        }
      }
    }
    const cr: CaseRow[] = [...caseCatalog.cases].sort((a, b) => a.caseKey.localeCompare(b.caseKey));
    return { signalRows, impactRows, caseRows: cr };
  }, []);

  return (
    <div className="rounded-xl border border-[var(--ds-border-subtle)] p-3 space-y-4 text-xs max-h-[min(80vh,900px)] overflow-auto">
      <p className="m-0 font-semibold text-sm ds-text-primary">Intelligence dependency graph (static artifacts)</p>
      <p className="m-0 ds-text-tertiary">
        Edges are derived from <span className="font-mono">IntakeIntelligenceContract</span> in the question bank. Case
        subgraphs use <span className="font-mono">intake-case-patterns.v1.json</span>.
      </p>
      <section>
        <h3 className="m-0 mb-1 text-[length:var(--text-2xs)] uppercase tracking-wide ds-text-tertiary">Question → signal</h3>
        <ul className="m-0 pl-4 list-disc font-mono leading-relaxed space-y-0.5 break-all">
          {signalRows.map(line => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>
      <section>
        <h3 className="m-0 mb-1 text-[length:var(--text-2xs)] uppercase tracking-wide ds-text-tertiary">
          Question → decision impact
        </h3>
        <ul className="m-0 pl-4 list-disc font-mono leading-relaxed space-y-0.5 break-all">
          {impactRows.map(line => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>
      <section>
        <h3 className="m-0 mb-1 text-[length:var(--text-2xs)] uppercase tracking-wide ds-text-tertiary">Case pattern overlays</h3>
        <ul className="m-0 pl-4 list-disc space-y-2 break-all">
          {caseRows.map(c => (
            <li key={c.caseKey}>
              <span className="font-mono font-semibold">{c.caseKey}</span>
              <span className="ds-text-tertiary"> — {c.title}</span>
              <div className="mt-0.5 font-mono">overlay: {c.overlayQuestionIds.join(', ')}</div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
