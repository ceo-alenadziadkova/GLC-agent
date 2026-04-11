/**
 * Product copy for public Discovery findings — `discovery-findings-copy.v1.json`.
 */
import raw from './discovery-findings-copy.v1.json' with { type: 'json' };

export type DiscoveryFindingHookCopy = 'revenue' | 'time' | 'visibility' | 'risk' | 'scale';

export interface DiscoveryFindingCopyRow {
  zone: string;
  impact: 'high' | 'medium';
  hook: DiscoveryFindingHookCopy;
  headline: string;
  detail: string;
}

type CopyFile = { version: string; findings: Record<string, DiscoveryFindingCopyRow> };

const file = raw as CopyFile;

export const DISCOVERY_FINDINGS_COPY: Readonly<Record<string, DiscoveryFindingCopyRow>> = file.findings;

/** Replace `{{key}}` with values from `vars` (missing keys → empty string). */
export function fillDiscoveryFindingTemplate(
  template: string,
  vars: Record<string, string | undefined>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_m, key: string) => vars[key] ?? '');
}
