import { SNAPSHOT_PATH_HINT_REGEXES } from '../../config/snapshot-fetch-heuristics.js';
import { SNAPSHOT_PATH_PRIORITY_POLICY } from '../config/fetch-tiered-policy.js';

export function scorePath(urlStr: string): number {
  let score = 0;
  try {
    const pathname = new URL(urlStr).pathname.toLowerCase();
    for (const regex of SNAPSHOT_PATH_HINT_REGEXES) {
      if (regex.test(pathname)) {
        score += SNAPSHOT_PATH_PRIORITY_POLICY.hintMatchScore;
      }
    }
    const depth = pathname.split('/').filter(Boolean).length;
    if (depth <= SNAPSHOT_PATH_PRIORITY_POLICY.shallowPathDepthMax) {
      score += SNAPSHOT_PATH_PRIORITY_POLICY.shallowPathScore;
    }
  } catch {
    return 0;
  }
  return score;
}
