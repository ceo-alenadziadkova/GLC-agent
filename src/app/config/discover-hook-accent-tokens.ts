import type { DiscoveryFinding } from '../lib/discovery-flow';

/**
 * Maps discover finding hooks to semantic CSS variables (theme-aware).
 * Replaces raw hex from CMS JSON for hook accent only; labels stay in copy JSON.
 */
export const DISCOVER_HOOK_ACCENT_TOKEN: Record<DiscoveryFinding['hook'], string> = {
  revenue: 'var(--score-1)',
  time: 'var(--callout-warning-fg-emphasis)',
  visibility: 'var(--ui-strategic-purple)',
  risk: 'var(--score-2)',
  scale: 'var(--primary)',
};
