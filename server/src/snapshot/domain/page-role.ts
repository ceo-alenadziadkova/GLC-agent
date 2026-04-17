import { SNAPSHOT_PAGE_ROLE_PATTERNS } from '../config/fetch-tiered-policy.js';
import type { SnapshotPageRole } from '../types.js';

export function inferSnapshotPageRole(pathname: string): SnapshotPageRole {
  const normalizedPath = pathname.toLowerCase();
  if (normalizedPath === '/' || normalizedPath === '') {
    return 'home';
  }
  if (SNAPSHOT_PAGE_ROLE_PATTERNS.contact.test(normalizedPath)) {
    return 'contact';
  }
  if (SNAPSHOT_PAGE_ROLE_PATTERNS.pricing.test(normalizedPath)) {
    return 'pricing';
  }
  if (SNAPSHOT_PAGE_ROLE_PATTERNS.about.test(normalizedPath)) {
    return 'about';
  }
  if (SNAPSHOT_PAGE_ROLE_PATTERNS.services.test(normalizedPath)) {
    return 'services';
  }
  return 'other';
}
