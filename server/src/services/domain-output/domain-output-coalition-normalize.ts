/**
 * Applies bounded, deterministic repairs to coalition-domain Claude tool payloads so Zod can accept
 * common model slips without token-burning corrective LLM rounds.
 */
import { DOMAIN_KEYS } from '@glc/intake-core';

import {
  CANON_CROSS_DOMAIN_PEER_REF_REGEX,
  DOMAIN_CROSS_REF_PREFIX_ALIAS,
  DOMAIN_OUTPUT_VERIFICATION_METHOD_VALUES,
  RECOMMENDATION_IMPACT_PERCENT_BENCHMARK_SUFFIX_EN,
  type DomainOutputVerificationMethod,
} from '../../config/domain-agent-tool-output-normalize-policy.js';
import { coerceDirectorSliceJsonBlob } from '../../schemas/glc-director-orchestration-slice.js';
import type { DomainKey } from '../../types/audit.js';

export function isDomainAgentOutputKey(domainKey: string): domainKey is DomainKey {
  return (DOMAIN_KEYS as readonly string[]).includes(domainKey);
}

const DOMAIN_KEYS_LOWER = new Set(DOMAIN_KEYS.map((k) => k.toLowerCase()));

const ALLOWED_VERIFICATION_METHODS = new Set<string>(DOMAIN_OUTPUT_VERIFICATION_METHOD_VALUES);

export type NormalizeDomainAgentToolInputResult = {
  value: unknown;
  mutated: boolean;
  mutationCodes: readonly string[];
};

function cloneJson<T>(input: T): T {
  return JSON.parse(JSON.stringify(input)) as T;
}

function normalizeCrossDomainRefToken(raw: string): string | undefined {
  const s = raw.trim();
  const confLower = s.match(/^conf-(\d+)$/i);
  if (confLower) {
    const n = confLower[1]?.replace(/^0+/, '');
    if (n !== undefined && /^[1-9]\d*$/.test(n)) return `CONF-${n}`;
    return undefined;
  }
  if (/^CONF-[1-9]\d*$/i.test(s)) {
    const digits = s.split('-')[1] ?? '';
    const n = digits.replace(/^0+/, '');
    if (/^[1-9]\d*$/.test(n)) return `CONF-${n}`;
    return undefined;
  }
  const idx = s.indexOf(':');
  if (idx === -1) return undefined;
  const prefixPart = s.slice(0, idx).trim().toLowerCase().replace(/-/g, '_');
  const hypoMatch = s.slice(idx + 1).trim().toUpperCase().match(/^H([1-9]\d*)$/);
  if (!hypoMatch?.[1]) return undefined;

  let domain: string | undefined;
  if (DOMAIN_KEYS_LOWER.has(prefixPart)) domain = prefixPart;
  else domain = DOMAIN_CROSS_REF_PREFIX_ALIAS[prefixPart];

  if (!domain || !DOMAIN_KEYS_LOWER.has(domain)) return undefined;

  const out = `${domain}:H${hypoMatch[1]}`;
  return CANON_CROSS_DOMAIN_PEER_REF_REGEX.test(out) ? out : undefined;
}

/** Returns normalized refs and whether anything was dropped, rewritten, or deduped. */
function coerceCrossDomainRefsArray(refs: unknown): { next?: string[]; changed: boolean } {
  if (!Array.isArray(refs)) return { changed: false };
  const stringCandidates = refs.filter((x): x is string => typeof x === 'string');
  let changed =
    refs.length !== stringCandidates.length ||
    refs.some((x) => typeof x !== 'string');
  const next: string[] = [];
  const seen = new Set<string>();

  for (const raw of stringCandidates) {
    const canon = normalizeCrossDomainRefToken(raw);
    if (!canon) {
      changed = true;
      continue;
    }
    if (canon !== raw.trim()) changed = true;
    if (!seen.has(canon)) {
      seen.add(canon);
      next.push(canon);
    }
    else {
      changed = true;
    }
  }

  if (next.length === 0 && stringCandidates.length === 0) return { changed, next };
  return { changed, next };
}

function normalizeDirectorActions(actions: unknown): boolean {
  if (!Array.isArray(actions)) return false;
  let changed = false;
  for (const act of actions) {
    if (!act || typeof act !== 'object' || Array.isArray(act)) continue;
    const obj = act as Record<string, unknown>;
    const { next, changed: refChanged } = coerceCrossDomainRefsArray(obj.cross_domain_refs);
    if (!refChanged) continue;
    changed = true;
    if (!next?.length) delete obj.cross_domain_refs;
    else obj.cross_domain_refs = next;
  }
  return changed;
}

function mutateRootGlcDirectorExecution(root: Record<string, unknown>, mutationCodes: string[]): void {
  if (!('glc_director_execution' in root)) return;

  const rawField = root.glc_director_execution;
  const coercedOnce = coerceDirectorSliceJsonBlob(rawField);

  let sliceToWalk: Record<string, unknown> | undefined;

  if (typeof rawField === 'string' && typeof coercedOnce === 'object' && coercedOnce !== null && !Array.isArray(coercedOnce)) {
    mutationCodes.push('glc_director_execution_blob_structured');
    sliceToWalk = cloneJson(coercedOnce);
  }
  else if (coercedOnce && typeof coercedOnce === 'object' && !Array.isArray(coercedOnce)) {
    sliceToWalk = cloneJson(coercedOnce as Record<string, unknown>);
  }
  else return;

  let refsChanged = false;
  for (const wave of ['baseline', 'deep'] as const) {
    const bundle = sliceToWalk[wave];
    if (!bundle || typeof bundle !== 'object' || Array.isArray(bundle)) continue;
    const b = bundle as Record<string, unknown>;
    refsChanged = normalizeDirectorActions(b.actions) || refsChanged;
  }

  if (refsChanged) {
    mutationCodes.push('glc_director_cross_domain_refs_coerced');
  }

  root.glc_director_execution = sliceToWalk;
}

/**
 * Claude sometimes emits free-text verifier labels (`tech_stack_detect`, etc.) that do not exist in schema enum.
 */
function coerceRecordVerificationMethod(
  record: Record<string, unknown>,
  mutationCodes: string[],
  mutationSuffix: string,
): void {
  const vmRaw = record.verification_method;
  if (vmRaw === undefined) return;
  const status = record.status;

  if (typeof vmRaw !== 'string') {
    delete record.verification_method;
    mutationCodes.push(`verification_method_non_string_removed_${mutationSuffix}`);
    return;
  }
  const vmTrim = vmRaw.trim();
  if (ALLOWED_VERIFICATION_METHODS.has(vmTrim)) {
    return;
  }
  const replacement: DomainOutputVerificationMethod =
    status === 'not_assessed' ? 'not_assessed' : 'heuristic';
  record.verification_method = replacement;
  mutationCodes.push(`verification_method_unknown_coerced_${mutationSuffix}`);
}

function normalizeIssues(raw: unknown, mutationCodes: string[]): void {
  if (!Array.isArray(raw)) return;
  for (const item of raw) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const issue = item as Record<string, unknown>;

    coerceRecordVerificationMethod(issue, mutationCodes, 'issue');

    const st = issue.status;
    const sev = issue.severity;
    if (
      (st === 'unverified' || st === 'not_assessed') &&
      (sev === 'critical' || sev === 'high')
    ) {
      issue.severity = 'medium';
      mutationCodes.push('issue_severity_downgraded_non_confirmed');
    }

    if (
      issue.status === 'not_assessed' &&
      typeof issue.verification_method === 'string' &&
      issue.verification_method !== 'not_assessed'
    ) {
      issue.verification_method = 'not_assessed';
      mutationCodes.push('issue_verification_method_aligned');
    }
  }
}

function normalizeRecommendations(raw: unknown, mutationCodes: string[]): void {
  if (!Array.isArray(raw)) return;
  for (const item of raw) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const rec = item as Record<string, unknown>;

    coerceRecordVerificationMethod(rec, mutationCodes, 'recommendation');

    const impact = rec.impact;
    if (typeof impact === 'string') {
      const hasPercent = /\b\d{1,3}\s*-\s*\d{1,3}%|\b\d{1,3}%/.test(impact);
      const hasSourceCue = /\b(source|benchmark|industry|study)\b/i.test(impact);
      if (hasPercent && !hasSourceCue) {
        rec.impact = `${impact.trimEnd()}${RECOMMENDATION_IMPACT_PERCENT_BENCHMARK_SUFFIX_EN}`;
        mutationCodes.push('recommendation_impact_benchmark_hint_appended');
      }
    }

    const evLen = Array.isArray(rec.evidence_refs) ? rec.evidence_refs.length : 0;
    const st = rec.status;
    if (st && st !== 'confirmed' && evLen === 0) {
      delete rec.status;
      delete rec.verification_method;
      mutationCodes.push('recommendation_non_confirmed_status_stripped_without_evidence');
    }

    if (
      rec.status === 'not_assessed' &&
      typeof rec.verification_method === 'string' &&
      rec.verification_method !== 'not_assessed'
    ) {
      rec.verification_method = 'not_assessed';
      mutationCodes.push('recommendation_verification_method_aligned');
    }
  }
}

/**
 * Returns a cloned payload with deterministic repairs suitable for feeding into `DomainOutputSchema.safeParse`.
 */
export function normalizeDomainAgentToolInputForSchema(toolInput: unknown): NormalizeDomainAgentToolInputResult {
  if (toolInput === null || typeof toolInput !== 'object' || Array.isArray(toolInput)) {
    return { value: toolInput, mutated: false, mutationCodes: [] };
  }

  const root = cloneJson(toolInput) as Record<string, unknown>;
  const mutationCodes: string[] = [];

  mutateRootGlcDirectorExecution(root, mutationCodes);
  normalizeIssues(root.issues, mutationCodes);
  normalizeRecommendations(root.recommendations, mutationCodes);

  const originalSnapshot = JSON.stringify(toolInput);
  const outSnapshot = JSON.stringify(root);
  const mutated = originalSnapshot !== outSnapshot || mutationCodes.length > 0;
  const mutationCodesDedup = [...new Set(mutationCodes)];

  return { value: root, mutated, mutationCodes: mutationCodesDedup };
}
