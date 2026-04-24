import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Before injecting design tokens: native `getComputedStyle(document.documentElement)` in jsdom
// can allocate huge style maps and stall or OOM workers (e.g. SyncPathLoader reads CSS vars).
const originalGetComputedStyle = window.getComputedStyle.bind(window);
Object.defineProperty(window, 'getComputedStyle', {
  configurable: true,
  writable: true,
  value: (element: Element, pseudoElt?: string | null) => {
    if (element === document.documentElement) {
      return {
        getPropertyValue: () => '',
      } as unknown as CSSStyleDeclaration;
    }
    return originalGetComputedStyle(element, pseudoElt ?? undefined);
  },
});

import '../styles/tokens.css';

vi.stubEnv('VITE_SUPABASE_URL', 'http://127.0.0.1:54321');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'vitest-supabase-anon-key');

// jsdom has no matchMedia; theme hooks and marketing layout use it.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  configurable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// React Flow / @xyflow uses ResizeObserver on the graph pane.
vi.stubGlobal(
  'ResizeObserver',
  class {
    disconnect() {}
    observe() {}
    unobserve() {}
  },
);

// Framer Motion in-view and similar features use IntersectionObserver.
vi.stubGlobal(
  'IntersectionObserver',
  class {
    readonly root: Element | null = null;
    readonly rootMargin = '';
    readonly thresholds: ReadonlyArray<number> = [];
    disconnect() {}
    observe() {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
    unobserve() {}
  },
);

// jsdom SVG stubs: GSAP MotionPathPlugin calls svg.getCTM() on mount (SyncPathLoader).
if (typeof SVGSVGElement !== 'undefined' && !SVGSVGElement.prototype.getCTM) {
  SVGSVGElement.prototype.getCTM = function getCTM() {
    return {
      a: 1,
      b: 0,
      c: 0,
      d: 1,
      e: 0,
      f: 0,
    } as SVGMatrix;
  };
}
