import raw from '../layout-rules.v1.json' with { type: 'json' };

import type { LayoutRulesV1 } from './layout-types.js';

export const LAYOUT_RULES_V1 = raw as LayoutRulesV1;

export function loadLayoutRules(): LayoutRulesV1 {
  return LAYOUT_RULES_V1;
}
