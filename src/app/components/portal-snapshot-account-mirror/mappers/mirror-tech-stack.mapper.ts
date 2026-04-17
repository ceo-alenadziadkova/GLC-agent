import { PORTAL_SNAPSHOT_MIRROR_CONSTANTS } from '../config/portal-snapshot-account-mirror.constants';

export function mapTechStackToChips(techStack: Record<string, string[]> | null | undefined): string[] {
  if (!techStack) return [];
  return Object.entries(techStack)
    .filter(([, values]) => Array.isArray(values) && values.length > 0)
    .flatMap(([, values]) => values)
    .slice(0, PORTAL_SNAPSHOT_MIRROR_CONSTANTS.techStackChipLimit);
}
