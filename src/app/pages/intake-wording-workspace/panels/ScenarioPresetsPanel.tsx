import { INTAKE_TRACE_SCENARIO_PRESETS } from '../../../lib/intake-trace-scenarios';
import { INTAKE_WORDING_WORKSPACE_COPY as W } from '../../../config/intake-wording-workspace-copy';

export function ScenarioPresetsPanel({ onApplyPreset }: { onApplyPreset: (id: string) => void }) {
  return (
    <details className="rounded-lg border border-[var(--glc-border)] bg-[var(--glc-surface-2)] p-3">
      <summary className="cursor-pointer text-sm font-medium">{W.scenarioPresets.summaryLabel}</summary>
      <div className="mt-2 flex flex-wrap gap-2">
        {INTAKE_TRACE_SCENARIO_PRESETS.map(preset => (
          <button
            key={preset.id}
            type="button"
            className="glc-btn-secondary text-xs px-2 py-1"
            onClick={() => onApplyPreset(preset.id)}
            title={preset.hint}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </details>
  );
}
