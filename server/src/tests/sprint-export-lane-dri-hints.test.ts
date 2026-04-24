import { describe, expect, it } from 'vitest';

import { suggestedDriLabelForLane } from '../config/sprint-export-lane-dri-hints.js';

describe('sprint-export-lane-dri-hints', () => {
  it('maps known lanes to role hints', () => {
    expect(suggestedDriLabelForLane('gtm_sales')).toBe('RevOps / Sales');
    expect(suggestedDriLabelForLane('marketing_narrative')).toBe('Marketing');
  });

  it('returns empty for unknown lane ids', () => {
    expect(suggestedDriLabelForLane('not_a_lane')).toBe('');
  });
});
