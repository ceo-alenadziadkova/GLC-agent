import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ApproveCoalitionGate } from '../ApproveCoalitionGate';

describe('ApproveCoalitionGate', () => {
  it('emits a verified override note when essential fields are edited', async () => {
    const user = userEvent.setup();
    const onVerifiedOverrideChange = vi.fn();
    render(
      <ApproveCoalitionGate
        snapshot={{
          entity_type: 'mvp',
          dominant_constraint: 'traffic',
          strategic_mode: 'launch',
          maturity: {
            product_clarity: 3,
            audience_clarity: 3,
            positioning_strength: 2,
            channel_readiness: 2,
            resource_constraints: 2,
          },
        }}
        onVerifiedOverrideChange={onVerifiedOverrideChange}
      />,
    );

    await user.clear(screen.getByLabelText('Strategic mode'));
    await user.type(screen.getByLabelText('Strategic mode'), 'growth');

    const latestNote = String(onVerifiedOverrideChange.mock.calls.at(-1)?.[0] ?? '');
    expect(latestNote).toContain('[verified_by_server:true]');
    expect(latestNote).toContain('"strategic_mode":"growth"');
  });
});
