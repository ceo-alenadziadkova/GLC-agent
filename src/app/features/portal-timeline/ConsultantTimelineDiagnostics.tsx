import {
  formatTimelineApiStatusSupportLine,
  ORCHESTRATION_UI_COPY,
} from '../../config/orchestration-roadmap-ui-copy.en';
import type { OrchestrationTimelineStatus } from '../../config/orchestration-contract';

export function ConsultantTimelineDiagnostics({
  className,
  timelineStatus,
  manifestState,
}: {
  className?: string;
  timelineStatus: OrchestrationTimelineStatus;
  manifestState: string;
}) {
  return (
    <details className={className}>
      <summary className="cursor-pointer text-sm font-medium text-foreground">
        {ORCHESTRATION_UI_COPY.timelineConsultantTechnicalSummary}
      </summary>
      <div className="mt-3 space-y-2 rounded-md border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
        <p className="font-mono text-[length:var(--text-2xs)] leading-relaxed">
          {formatTimelineApiStatusSupportLine(timelineStatus)}
        </p>
        <p className="font-mono text-[length:var(--text-2xs)] leading-relaxed">
          {ORCHESTRATION_UI_COPY.timelineManifestStateLabel} {manifestState}
        </p>
      </div>
    </details>
  );
}
