import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';

import { ORCHESTRATION_UI_COPY } from '../../../config/orchestration-roadmap-ui-copy.en';
import type { OrchestrationPackRevisionHistoryItemDto } from '../../../data/api/audits-orchestration';
import { ORCHESTRATION_PACK_DIFF_SCHEMA_VERSION } from '../../../config/orchestration-contract';
import { RevisionHistoryPanel } from '../RevisionHistoryPanel';

describe('RevisionHistoryPanel a11y', () => {
  it('exposes listitem roles and diff summary in aria-label for screen readers', () => {
    const item: OrchestrationPackRevisionHistoryItemDto = {
      from_version: 2,
      to_version: 3,
      diff: {
        schema_version: ORCHESTRATION_PACK_DIFF_SCHEMA_VERSION,
        from_version: 2,
        to_version: 3,
        nodes_added: ['a', 'b'],
        nodes_removed: ['c'],
        nodes_lane_changed: [],
        edges_added: [{ from: 'a', to: 'b' }],
        edges_removed: [],
        critical_path_changed: false,
        conflicts_resolved_before: 0,
        conflicts_resolved_after: 1,
      },
    };

    render(<RevisionHistoryPanel items={[item]} />);

    const list = screen.getByRole('list');
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(1);

    const expectedLabel = ORCHESTRATION_UI_COPY.revisionHistoryRowAriaTemplate
      .replace('{from}', '2')
      .replace('{to}', '3')
      .replace('{nodesAdded}', '2')
      .replace('{nodesRemoved}', '1')
      .replace('{edgesAdded}', '1')
      .replace('{edgesRemoved}', '0');

    expect(items[0]).toHaveAttribute('aria-label', expectedLabel);
  });
});
