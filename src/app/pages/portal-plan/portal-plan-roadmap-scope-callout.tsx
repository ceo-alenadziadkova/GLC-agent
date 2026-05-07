import { useEffect, useId, useState } from 'react';

import { Button } from '../../components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../components/ui/collapsible';
import { PLAN_WORKSPACE_UI_COPY } from '../../config/plan-workspace-ui-copy.en';

const educationAckStorageKey = (auditId: string) => `glc.plan.roadmapScope.educationAck.${auditId}`;

export type PortalPlanRoadmapScopeCalloutProps = {
  auditId: string;
  governanceBlocked: boolean;
  orphanCardCount: number;
};

/**
 * Roadmap (Gantt) scope vs Delivery Board — shown when the user has not dismissed the educational
 * tip this session, or when governance/orphan signals need attention.
 */
export function PortalPlanRoadmapScopeCallout({
  auditId,
  governanceBlocked,
  orphanCardCount,
}: PortalPlanRoadmapScopeCalloutProps) {
  const triggerId = useId();
  const urgent = governanceBlocked || orphanCardCount > 0;
  const storageKey = educationAckStorageKey(auditId);

  const [educationAcked, setEducationAcked] = useState(() => {
    try {
      return typeof sessionStorage !== 'undefined' && sessionStorage.getItem(storageKey) === '1';
    } catch {
      return false;
    }
  });

  const [open, setOpen] = useState(urgent);

  useEffect(() => {
    if (urgent) setOpen(true);
  }, [urgent]);

  // Hide-after-hooks gate so React Hook order stays stable across renders.
  if (!urgent && educationAcked) {
    return null;
  }

  function dismissEducationForSession(): void {
    try {
      sessionStorage.setItem(storageKey, '1');
    } catch {
      /* storage may be unavailable */
    }
    setEducationAcked(true);
  }

  const orphanNote =
    orphanCardCount > 0 ?
      PLAN_WORKSPACE_UI_COPY.roadmapScopeCalloutOrphanNote.replace('{count}', String(orphanCardCount))
    : null;

  return (
    <aside
      className="border-border bg-muted/20 rounded-lg border px-3 py-2"
      aria-label={PLAN_WORKSPACE_UI_COPY.roadmapViewInteractionScopeAriaLabel}
    >
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
          <CollapsibleTrigger asChild>
            <Button
              id={triggerId}
              type="button"
              variant="ghost"
              size="sm"
              aria-expanded={open}
              className="text-muted-foreground hover:text-foreground h-auto min-h-0 flex-1 justify-start px-0 py-0 text-left text-xs font-medium"
            >
              {open ?
                PLAN_WORKSPACE_UI_COPY.roadmapScopeCalloutCollapseTrigger
              : PLAN_WORKSPACE_UI_COPY.roadmapScopeCalloutExpandTrigger}
            </Button>
          </CollapsibleTrigger>
          {!urgent && !educationAcked ?
            <Button type="button" variant="ghost" size="sm" className="h-auto shrink-0 px-2 py-1 text-xs" onClick={dismissEducationForSession}>
              {PLAN_WORKSPACE_UI_COPY.roadmapScopeCalloutDismissForSession}
            </Button>
          : null}
        </div>
        <CollapsibleContent>
          <div className="border-border space-y-3 border-t border-dashed pt-3 mt-2">
            {governanceBlocked ?
              <p className="text-muted-foreground m-0 text-sm leading-relaxed" role="status">
                {PLAN_WORKSPACE_UI_COPY.roadmapScopeCalloutGovernanceNote}
              </p>
            : null}
            {orphanNote ? (
              <p className="text-muted-foreground m-0 text-sm leading-relaxed" role="status">
                {orphanNote}
              </p>
            ) : null}
            <p className="text-muted-foreground m-0 text-sm leading-relaxed">{PLAN_WORKSPACE_UI_COPY.roadmapViewInteractionScopeNote}</p>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </aside>
  );
}
