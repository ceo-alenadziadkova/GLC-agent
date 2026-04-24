/**
 * Vitest-only: default `render` wraps with {@link DictationProvider} so page tests
 * do not need per-file provider wiring. Real package: `@testing-library/react-impl`.
 */
import {
  render as baseRender,
  type RenderOptions,
} from '@testing-library/react-impl';
import type { ReactElement, ReactNode } from 'react';

import { DictationProvider } from '../app/components/dictation/dictation-context';

export * from '@testing-library/react-impl';

export function render(ui: ReactElement, options?: RenderOptions) {
  const { wrapper: W, ...rest } = options ?? {};
  return baseRender(ui, {
    ...rest,
    wrapper: function WithDictationProvider({ children }: { children: ReactNode }) {
      return <DictationProvider>{W ? <W>{children}</W> : children}</DictationProvider>;
    },
  });
}
