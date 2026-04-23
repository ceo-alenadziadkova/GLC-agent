import type { GlcOrchestrationPackView } from '../../data/audit/contracts/report/orchestration-pack.types';
import { ORCHESTRATION_UI_COPY } from '../../config/orchestration-roadmap-ui-copy.en';

export function PlanControlObjectPanel(args: { pack: GlcOrchestrationPackView }) {
  const co = args.pack.control_object;
  if (!co) return null;
  return (
    <div className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-raised)] p-4 text-sm">
      <h3 className="font-semibold ds-text-primary">{ORCHESTRATION_UI_COPY.controlObjectTitle}</h3>
      <p className="mt-2 leading-relaxed ds-text-secondary">{co.objective}</p>
      {co.constraints && co.constraints.length > 0 ? (
        <ul className="mt-2 list-inside list-disc text-xs ds-text-tertiary">
          {co.constraints.map(c => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      ) : null}
      {co.exit_criteria && co.exit_criteria.length > 0 ? (
        <div className="mt-3">
          <h4 className="text-xs font-medium uppercase ds-text-tertiary">
            {ORCHESTRATION_UI_COPY.controlObjectExitCriteria}
          </h4>
          <ul className="mt-1 list-inside list-disc text-xs ds-text-tertiary">
            {co.exit_criteria.map(c => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {co.escalation_rules && co.escalation_rules.length > 0 ? (
        <div className="mt-3">
          <h4 className="text-xs font-medium uppercase ds-text-tertiary">
            {ORCHESTRATION_UI_COPY.controlObjectEscalation}
          </h4>
          <ul className="mt-1 list-inside list-disc text-xs ds-text-tertiary">
            {co.escalation_rules.map(c => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
