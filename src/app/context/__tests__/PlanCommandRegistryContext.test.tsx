import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useMemo } from 'react';

import {
  PlanCommandRegistryProvider,
  usePlanCommandRegistration,
  usePlanCommandSurfaceCommands,
} from '../PlanCommandRegistryContext';
import type { PlanWorkspacePaletteCommand } from '../../lib/plan-command-registry';

function SurfaceA() {
  const cmds = useMemo(
    (): PlanWorkspacePaletteCommand[] => [
      { id: 'a-1', label: 'Alpha', keywords: 'a', run: () => {} },
    ],
    [],
  );
  usePlanCommandRegistration('chunk-a', cmds);
  return null;
}

function SurfaceB() {
  const cmds = useMemo(
    (): PlanWorkspacePaletteCommand[] => [
      { id: 'b-1', label: 'Beta', keywords: 'b', run: () => {} },
    ],
    [],
  );
  usePlanCommandRegistration('chunk-b', cmds);
  return null;
}

function Probe() {
  const cmds = usePlanCommandSurfaceCommands();
  return <div data-testid="cmd-count">{cmds.length}</div>;
}

function RegistryHarness({ withB }: { withB: boolean }) {
  return (
    <PlanCommandRegistryProvider>
      <SurfaceA />
      {withB ? <SurfaceB /> : null}
      <Probe />
    </PlanCommandRegistryProvider>
  );
}

describe('PlanCommandRegistryContext', () => {
  it('merges registered chunks in stable chunk-id order', () => {
    render(<RegistryHarness withB />);
    expect(screen.getByTestId('cmd-count')).toHaveTextContent('2');
  });

  it('drops commands when a chunk unmounts', () => {
    render(<RegistryHarness withB={false} />);
    expect(screen.getByTestId('cmd-count')).toHaveTextContent('1');
  });
});
