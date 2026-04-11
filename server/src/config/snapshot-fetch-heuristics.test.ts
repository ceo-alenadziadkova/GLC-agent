import { describe, expect, it } from 'vitest';

import {
  SNAPSHOT_FETCH_ACCEPT_LANGUAGE,
  SNAPSHOT_HEAD_ACCEPT_LANGUAGE,
  SNAPSHOT_PATH_HINT_REGEXES,
  SNAPSHOT_ROBOTS_FALLBACK_HTML_PATHS,
} from './snapshot-fetch-heuristics.js';

describe('snapshot-fetch-heuristics', () => {
  it('defaults: path hints match typical marketing paths', () => {
    expect(SNAPSHOT_PATH_HINT_REGEXES.some((re) => re.test('/about'))).toBe(true);
    expect(SNAPSHOT_PATH_HINT_REGEXES.some((re) => re.test('/pricing'))).toBe(true);
    expect(SNAPSHOT_ROBOTS_FALLBACK_HTML_PATHS).toContain('/contact');
    expect(SNAPSHOT_FETCH_ACCEPT_LANGUAGE).toContain('en');
    expect(SNAPSHOT_HEAD_ACCEPT_LANGUAGE).toContain('en');
  });
});
