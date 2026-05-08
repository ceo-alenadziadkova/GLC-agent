import { describe, it, expect } from 'vitest';
import { useLayoutEffect, useMemo } from 'react';
import { render } from '@testing-library/react';

import {
  PlanAdvancedDrawerProvider,
  useOptionalPlanAdvancedDrawer,
} from '../PlanAdvancedDrawerContext';

const MAX_PANEL_RENDERS = 24;

/**
 * Mirrors {@link StrategyLabOrchestrationPanel}: registers drawer content from a layout effect.
 * Must depend on stable setters only, not the whole context value object.
 */
function StableRegistrationConsumer(props: { renderCounter: { count: number } }) {
  props.renderCounter.count += 1;
  if (props.renderCounter.count > MAX_PANEL_RENDERS) {
    throw new Error('update loop: consumer re-rendered too many times');
  }

  const ctx = useOptionalPlanAdvancedDrawer();
  const setContent = ctx?.setContent;
  const setPreviewLine = ctx?.setPreviewLine;

  const body = useMemo(() => <span data-testid="advanced-body">registered</span>, []);

  useLayoutEffect(() => {
    if (!setContent || !setPreviewLine) return;
    setContent(body);
    setPreviewLine('preview line');
    return () => {
      setContent(null);
      setPreviewLine(null);
    };
  }, [setContent, setPreviewLine, body]);

  return null;
}

describe('PlanAdvancedDrawerProvider', () => {
  it('does not recurse when advanced sections register via stable setter deps', async () => {
    const renderCounter = { count: 0 };

    render(
      <PlanAdvancedDrawerProvider>
        <StableRegistrationConsumer renderCounter={renderCounter} />
      </PlanAdvancedDrawerProvider>,
    );

    expect(renderCounter.count).toBeLessThanOrEqual(MAX_PANEL_RENDERS);
    // Stable pattern: panel mounts and registers content without re-running on every new context object.
    expect(renderCounter.count).toBeLessThanOrEqual(8);
  });
});
