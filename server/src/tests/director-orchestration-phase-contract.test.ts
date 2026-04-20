import { describe, expect, it } from 'vitest';

import {
  DIRECTOR_ORCHESTRATION_ALLOWED_PHASES,
  DIRECTOR_ORCHESTRATION_STRICT_PHASES,
} from '../config/director-orchestration-policy.js';

describe('director orchestration phase contract', () => {
  it('strict phases are a subset of allowed domain phases', () => {
    const allowed = new Set<number>(DIRECTOR_ORCHESTRATION_ALLOWED_PHASES);
    for (const phase of DIRECTOR_ORCHESTRATION_STRICT_PHASES) {
      expect(allowed.has(phase)).toBe(true);
    }
  });

  it('covers all six domain phases in the allowed list', () => {
    expect(DIRECTOR_ORCHESTRATION_ALLOWED_PHASES).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('treats SEO phase (3) as best-effort persistence, not strict', () => {
    const strict = DIRECTOR_ORCHESTRATION_STRICT_PHASES as readonly number[];
    expect(strict.includes(3)).toBe(false);
  });
});
