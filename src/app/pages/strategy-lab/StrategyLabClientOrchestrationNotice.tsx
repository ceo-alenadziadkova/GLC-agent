import { Link } from 'react-router';

import { Button } from '../../components/ui/button';
import { ORCHESTRATION_UI_COPY } from '../../config/orchestration-roadmap-ui-copy.en';

type StrategyLabClientOrchestrationNoticeProps = {
  planExecutionHref: string;
  /** When true, show read-only strip with link to plan surface. */
  readOnlyStrip: boolean;
  /** When true (and readOnlyStrip false), show hidden orchestration copy for portal clients. */
  hiddenForClient: boolean;
};

/**
 * Top-of-page notice for portal clients when orchestration UI is enabled (read-only vs hidden).
 */
export function StrategyLabClientOrchestrationNotice({
  planExecutionHref,
  readOnlyStrip,
  hiddenForClient,
}: StrategyLabClientOrchestrationNoticeProps) {
  if (readOnlyStrip) {
    return (
      <div className="bg-card flex flex-col gap-2 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground text-xs max-w-prose">{ORCHESTRATION_UI_COPY.clientTimelineReadOnlyHint}</p>
        <Button asChild variant="outline" size="sm" className="no-underline w-fit">
          <Link to={planExecutionHref}>{ORCHESTRATION_UI_COPY.clientOpenPlanSurface}</Link>
        </Button>
      </div>
    );
  }
  if (hiddenForClient) {
    return (
      <div className="text-muted-foreground border-b bg-card px-4 py-2 text-center text-xs">
        {ORCHESTRATION_UI_COPY.clientHidden}
      </div>
    );
  }
  return null;
}
