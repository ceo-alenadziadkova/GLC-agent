import type { ComponentProps } from 'react';

import { PortalTimelinePackGraphPanel } from '../../components/glc/PortalTimelinePackGraphPanel';

type PanelProps = ComponentProps<typeof PortalTimelinePackGraphPanel>;

/**
 * Consultant “full graph” view — same read model as the portal panel with expanded node/edge budgets.
 */
export function PackGraphConsultantCanvas(props: Omit<PanelProps, 'graphPresentation'>) {
  return <PortalTimelinePackGraphPanel {...props} graphPresentation="consultant_full" />;
}
