import { INTAKE_TRACE_SCENARIO_PRESETS } from '../../../lib/intake-trace-scenarios';
import { INTAKE_WORDING_WORKSPACE_COPY as W } from '../../../config/intake-wording-workspace-copy';
import { Button } from '../../../components/ui/button';

export function ScenarioPresetsPanel({ onApplyPreset }: { onApplyPreset: (id: string) => void }) {
  return (
    <details className="rounded-lg border border-[var(--glc-border)] bg-[var(--glc-surface-2)] p-3">
      <summary className="cursor-pointer text-sm font-medium">{W.scenarioPresets.summaryLabel}</summary>
      <div className="mt-2 flex flex-wrap gap-2">
        {INTAKE_TRACE_SCENARIO_PRESETS.map(preset => (
          <Button
            key={preset.id}
            type="button"
            variant="outline"
            size="sm"
            className="h-auto px-2 py-1 text-xs"
            onClick={() => onApplyPreset(preset.id)}
            title={preset.hint}
          >
            {preset.label}
          </Button>
        ))}
      </div>
    </details>
  );
}
