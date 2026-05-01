import { describe, expect, it } from 'vitest';

import type { AuditTimelineDto } from '../../data/api/audits-orchestration';
import { countTimelineLaneItems } from '../audit-timeline-lane-item-count';

describe('countTimelineLaneItems', () => {
  it('sums items across lanes', () => {
    const t = {
      lanes: [
        { lane_id: 'tech_delivery', items: [{ id: 'a' }, { id: 'b' }] },
        { lane_id: 'marketing_narrative', items: [{ id: 'c' }] },
      ],
    } as unknown as AuditTimelineDto;
    expect(countTimelineLaneItems(t)).toBe(3);
  });

  it('returns 0 when no lanes', () => {
    const t = { lanes: [] } as unknown as AuditTimelineDto;
    expect(countTimelineLaneItems(t)).toBe(0);
  });
});
