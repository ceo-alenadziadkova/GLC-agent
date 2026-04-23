/**
 * Minimal GSAP surface for Vitest — avoids loading the real library in jsdom workers.
 * Keep in sync with {@link ../app/components/SyncPathLoader.tsx} usage only.
 */

type Vars = Record<string, unknown> & { onStart?: () => void };

function createTimeline() {
  const self: Record<string, unknown> = {};
  self.to = (_target: unknown, vars?: Vars) => {
    if (vars && typeof vars.onStart === 'function') {
      try {
        vars.onStart();
      } catch {
        /* ignore — stub is best-effort */
      }
    }
    return self;
  };
  self.add = () => self;
  return self;
}

const api = {
  registerPlugin: () => {},
  context: (fn: () => void) => {
    try {
      fn();
    } catch {
      /* ignore */
    }
    return { revert: () => {} };
  },
  set: () => {},
  to: () => {},
  timeline: (opts?: { repeat?: number; onComplete?: () => void }) => {
    if (opts?.repeat === 0 && typeof opts.onComplete === 'function') {
      try {
        opts.onComplete();
      } catch {
        /* ignore */
      }
    }
    return createTimeline();
  },
};

export default api;
