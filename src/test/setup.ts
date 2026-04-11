import { vi } from 'vitest';
import '@testing-library/jest-dom';

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
