import type { SnapshotSiteProfile } from '../../types/audit.js';
import type { SiteProfile } from '../types.js';

export function toApiSiteProfile(p: SiteProfile): SnapshotSiteProfile {
  return { ...p };
}
