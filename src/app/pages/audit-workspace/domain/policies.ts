import { DOMAIN_KEYS, type DomainKey } from '../../../data/auditTypes';

/** Free snapshot pipeline only materialises UX / conversion analysis. */
export const SNAPSHOT_DOMAIN_KEYS: readonly DomainKey[] = ['ux_conversion'];

export function visibleDomainKeysForMeta(meta: {
  execution_plan?: { selected_domains?: DomainKey[] } | null;
  snapshot_token?: string | null;
}): readonly DomainKey[] {
  const selected = meta.execution_plan?.selected_domains;
  if (Array.isArray(selected) && selected.length > 0) {
    return selected;
  }
  if (meta.snapshot_token) return SNAPSHOT_DOMAIN_KEYS;
  return DOMAIN_KEYS;
}
