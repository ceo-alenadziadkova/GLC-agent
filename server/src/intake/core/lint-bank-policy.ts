/**
 * Static checks for question bank + intake policy (Phase 3). Safe to run in CI.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { BRANCH_RULES } from '../branch-rules.js';
import { INTAKE_REVENUE_BANK_ID } from '../legacy-response-aliases.js';
import { QUESTION_BANK_V1_STUBS, QUESTION_BANK_V1_IDS } from '../question-bank.js';
import type { IntakeQuestionStub } from '../types.js';

import { LAYOUT_RULES_V1 } from './load-layout.js';
import { INTAKE_POLICY_V1 } from './load-policy.js';
import type { IntakePolicyV1 } from './policy-types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CORE_DIR = __dirname;

export type LintSeverity = 'error' | 'warn';

export interface LintFinding {
  code: string;
  severity: LintSeverity;
  message: string;
  detail?: string;
}

export function lintUnknownBranchRefs(stubs: IntakeQuestionStub[] = QUESTION_BANK_V1_STUBS): LintFinding[] {
  const findings: LintFinding[] = [];
  const ruleKeys = new Set(Object.keys(BRANCH_RULES));
  for (const q of stubs) {
    const b = q.branchCondition;
    if (!b) continue;
    if (!ruleKeys.has(b)) {
      findings.push({
        code: 'UNKNOWN_BRANCH_REF',
        severity: 'error',
        message: `Question "${q.id}" references unknown branchCondition "${b}" (not in BRANCH_RULES).`,
        detail: q.id,
      });
    }
  }
  return findings;
}

export function lintOrphanPolicyDiscoveryIds(
  policy: IntakePolicyV1 = INTAKE_POLICY_V1,
  bankIds: Set<string> = QUESTION_BANK_V1_IDS,
): LintFinding[] {
  const findings: LintFinding[] = [];
  for (const id of policy.modes.discovery.included) {
    if (!bankIds.has(id)) {
      findings.push({
        code: 'ORPHAN_POLICY_ID',
        severity: 'error',
        message: `Policy discovery.included references unknown bank id "${id}".`,
        detail: id,
      });
    }
  }
  return findings;
}

export function lintOrphanPolicyPreBriefBankIds(
  policy: IntakePolicyV1 = INTAKE_POLICY_V1,
  bankIds: Set<string> = QUESTION_BANK_V1_IDS,
): LintFinding[] {
  const findings: LintFinding[] = [];
  const inc = policy.modes.pre_brief.bankIncluded ?? [];
  for (const id of inc) {
    if (!bankIds.has(id)) {
      findings.push({
        code: 'ORPHAN_PRE_BRIEF_BANK_ID',
        severity: 'error',
        message: `Policy pre_brief.bankIncluded references unknown bank id "${id}".`,
        detail: id,
      });
    }
  }
  return findings;
}

/** Every layout surface step / suppress id must exist in the question bank. */
export function lintLayoutReferencesUnknownBankIds(
  bankIds: Set<string> = QUESTION_BANK_V1_IDS,
): LintFinding[] {
  const findings: LintFinding[] = [];
  const surfaces = LAYOUT_RULES_V1.surfaces as Record<
    string,
    { steps?: Array<{ questionIds?: string[] }>; suppressQuestionIds?: string[] }
  >;
  for (const [surfaceKey, surface] of Object.entries(surfaces)) {
    for (const id of surface.suppressQuestionIds ?? []) {
      if (!bankIds.has(id)) {
        findings.push({
          code: 'LAYOUT_ORPHAN_ID',
          severity: 'error',
          message: `Layout surface "${surfaceKey}" suppressQuestionIds references unknown bank id "${id}".`,
          detail: id,
        });
      }
    }
    for (const step of surface.steps ?? []) {
      for (const id of step.questionIds ?? []) {
        if (!bankIds.has(id)) {
          findings.push({
            code: 'LAYOUT_ORPHAN_ID',
            severity: 'error',
            message: `Layout surface "${surfaceKey}" step references unknown bank id "${id}".`,
            detail: id,
          });
        }
      }
    }
  }
  return findings;
}

/**
 * Every bank question must be covered by at least one policy mode's participation rule.
 * Today `full` and `express` are `all_eligible` (covers entire bank); explicit lists add more ids.
 * Fails if a future mode drops all_eligible without listing every bank id elsewhere.
 */
export function lintMissingPolicyCoverage(
  policy: IntakePolicyV1 = INTAKE_POLICY_V1,
  bankIds: Set<string> = QUESTION_BANK_V1_IDS,
): LintFinding[] {
  const covered = new Set<string>();

  const touchAllEligible = (mode: { participation?: string } | undefined) => {
    if (mode?.participation === 'all_eligible') {
      for (const id of bankIds) covered.add(id);
    }
  };

  touchAllEligible(policy.modes.full);
  touchAllEligible(policy.modes.express);
  touchAllEligible(policy.modes.free_snapshot);

  if (policy.modes.discovery.participation === 'explicit') {
    for (const id of policy.modes.discovery.included) covered.add(id);
  }

  const findings: LintFinding[] = [];
  for (const id of bankIds) {
    if (!covered.has(id)) {
      findings.push({
        code: 'MISSING_POLICY_COVERAGE',
        severity: 'error',
        message: `Bank question "${id}" is not covered by any policy mode participation.`,
        detail: id,
      });
    }
  }
  return findings;
}

export function lintDuplicateDiscoveryIncluded(policy: IntakePolicyV1 = INTAKE_POLICY_V1): LintFinding[] {
  const seen = new Set<string>();
  const findings: LintFinding[] = [];
  for (const id of policy.modes.discovery.included) {
    if (seen.has(id)) {
      findings.push({
        code: 'DUPLICATE_DISCOVERY_INCLUDED',
        severity: 'error',
        message: `Duplicate id "${id}" in policy discovery.included.`,
        detail: id,
      });
    }
    seen.add(id);
  }
  return findings;
}

/**
 * Ids permitted in `syntheticRequired` even when the same id exists as a bank question.
 * Keep this minimal: the usual rule is still "no accidental bank id in synthetics".
 * Today: revenue is canonically `INTAKE_REVENUE_BANK_ID` in both places (ADR Phase 5).
 */
const ALLOWED_SYNTHETIC_BANK_OVERLAP: ReadonlySet<string> = new Set([INTAKE_REVENUE_BANK_ID]);

/**
 * Synthetic / SLA ids must not reuse an arbitrary bank question id as a policy key.
 */
export function lintSyntheticCollision(
  policy: IntakePolicyV1 = INTAKE_POLICY_V1,
  bankIds: Set<string> = QUESTION_BANK_V1_IDS,
): LintFinding[] {
  const findings: LintFinding[] = [];
  const synthetics = new Set([
    ...policy.modes.full.syntheticRequired,
    ...policy.modes.discovery.syntheticRequired,
  ]);
  for (const id of synthetics) {
    if (ALLOWED_SYNTHETIC_BANK_OVERLAP.has(id)) continue;
    if (bankIds.has(id)) {
      findings.push({
        code: 'SYNTHETIC_COLLISION',
        severity: 'error',
        message: `Synthetic required id "${id}" collides with a bank question id.`,
        detail: id,
      });
    }
  }
  for (const id of policy.modes.express.requiredAlways) {
    if (id !== 'revenue_model' && id !== 'a10' && !bankIds.has(id)) {
      findings.push({
        code: 'EXPRESS_REQUIRED_ORPHAN',
        severity: 'error',
        message: `Express requiredAlways "${id}" is not a bank id and not a legacy revenue alias.`,
        detail: id,
      });
    }
  }
  for (const id of policy.modes.express.requiredIfVisible) {
    if (!bankIds.has(id)) {
      findings.push({
        code: 'EXPRESS_IF_VISIBLE_ORPHAN',
        severity: 'error',
        message: `Express requiredIfVisible "${id}" is not a bank question id.`,
        detail: id,
      });
    }
  }
  return findings;
}

/** Bank JSON: deprecatedAt + priority required is inconsistent. */
export function lintDeprecatedStillRequired(): LintFinding[] {
  const findings: LintFinding[] = [];
  const bankPath = join(__dirname, '..', 'question-bank.v1.json');
  const raw = JSON.parse(readFileSync(bankPath, 'utf8')) as {
    questions: Array<{ id: string; priority?: string; deprecatedAt?: string }>;
  };
  for (const q of raw.questions) {
    if (q.deprecatedAt && q.priority === 'required') {
      findings.push({
        code: 'DEPRECATED_STILL_REQUIRED',
        severity: 'warn',
        message: `Question "${q.id}" is required but has deprecatedAt "${q.deprecatedAt}".`,
        detail: q.id,
      });
    }
  }
  return findings;
}

const FORBIDDEN_PATTERNS: { code: string; pattern: RegExp; hint: string }[] = [
  { code: 'FORBIDDEN_IMPORT_FS', pattern: /\bfrom\s+['"]node:fs['"]|\bfrom\s+['"]fs['"]/, hint: 'Do not use fs in intake/core (keep isomorphic).' },
  { code: 'FORBIDDEN_IMPORT_PATH', pattern: /\bfrom\s+['"]node:path['"]|\bfrom\s+['"]path['"]/, hint: 'Do not use path in intake/core.' },
  { code: 'FORBIDDEN_CHILD_PROCESS', pattern: /child_process/, hint: 'No child_process in intake/core.' },
];

const ALLOWLIST_CORE_FILES = new Set(['lint-bank-policy.ts']);

/** Scan intake/core sources for Node-only patterns (excluding allowlisted files). */
export function lintForbiddenImportsInCore(coreDir: string = CORE_DIR): LintFinding[] {
  const findings: LintFinding[] = [];
  const names = readdirSync(coreDir).filter(f => f.endsWith('.ts'));
  for (const name of names) {
    if (ALLOWLIST_CORE_FILES.has(name)) continue;
    const abs = join(coreDir, name);
    const content = readFileSync(abs, 'utf8');
    for (const { code, pattern, hint } of FORBIDDEN_PATTERNS) {
      if (pattern.test(content)) {
        findings.push({
          code,
          severity: 'error',
          message: `${name}: ${hint}`,
          detail: name,
        });
      }
    }
    if (/\bprocess\.env\b/.test(content)) {
      findings.push({
        code: 'FORBIDDEN_PROCESS_ENV',
        severity: 'error',
        message: `${name}: Do not use process.env in intake/core (keep isomorphic).`,
        detail: name,
      });
    }
  }
  return findings;
}

export function lintPreBriefBankIncludedJsonMatchesPolicy(
  policy: IntakePolicyV1 = INTAKE_POLICY_V1,
): LintFinding[] {
  const findings: LintFinding[] = [];
  try {
    const raw = readFileSync(join(CORE_DIR, '..', 'pre-brief-bank-included.json'), 'utf8');
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr) || !arr.every(x => typeof x === 'string')) {
      findings.push({
        code: 'PRE_BRIEF_BANK_INCLUDED_JSON_INVALID',
        severity: 'error',
        message: 'pre-brief-bank-included.json must be a JSON array of strings.',
      });
      return findings;
    }
    const fromPolicy = [...policy.modes.pre_brief.bankIncluded ?? []].sort().join(',');
    const fromFile = [...arr].sort().join(',');
    if (fromPolicy !== fromFile) {
      findings.push({
        code: 'PRE_BRIEF_BANK_INCLUDED_DRIFT',
        severity: 'error',
        message:
          'pre-brief-bank-included.json does not match intake-policy pre_brief.bankIncluded. Update the JSON file to match policy (frontend thin import).',
        detail: `policy=[${fromPolicy}] file=[${fromFile}]`,
      });
    }
  } catch (e) {
    findings.push({
      code: 'PRE_BRIEF_BANK_INCLUDED_JSON_READ',
      severity: 'error',
      message: `Could not read pre-brief-bank-included.json: ${(e as Error).message}`,
    });
  }
  return findings;
}

const CANON_QUESTION_JSON_KEYS = new Set([
  'id',
  'section',
  'priority',
  'branch',
  'label',
  'reportUse',
  'answer',
  'entityRole',
  'confidenceImpact',
  'sensitivity',
  'askOnce',
  'answerFreshnessDays',
  'owner',
  'introducedInVersion',
  'deprecatedAt',
]);

const CANON_ANSWER_TYPES = new Set([
  'text',
  'textarea',
  'single_select',
  'multi_select',
  'scale',
  'boolean',
]);

const CANON_IMPACT_LEVELS = new Set(['low', 'medium', 'high']);

function lintCanonOptionalQuestionMetadata(id: string, q: Record<string, unknown>, findings: LintFinding[]): void {
  if ('entityRole' in q) {
    if (typeof q.entityRole !== 'string' || q.entityRole.trim() === '') {
      findings.push({
        code: 'CANON_BAD_ENTITY_ROLE',
        severity: 'error',
        message: `question "${id}": entityRole must be a non-empty string when set.`,
        detail: id,
      });
    }
  }
  if ('confidenceImpact' in q) {
    const v = q.confidenceImpact;
    if (typeof v !== 'string' || !CANON_IMPACT_LEVELS.has(v)) {
      findings.push({
        code: 'CANON_BAD_CONFIDENCE_IMPACT',
        severity: 'error',
        message: `question "${id}": confidenceImpact must be one of low|medium|high.`,
        detail: id,
      });
    }
  }
  if ('sensitivity' in q) {
    const v = q.sensitivity;
    if (typeof v !== 'string' || !CANON_IMPACT_LEVELS.has(v)) {
      findings.push({
        code: 'CANON_BAD_SENSITIVITY',
        severity: 'error',
        message: `question "${id}": sensitivity must be one of low|medium|high.`,
        detail: id,
      });
    }
  }
  if ('askOnce' in q && typeof q.askOnce !== 'boolean') {
    findings.push({
      code: 'CANON_BAD_ASK_ONCE',
      severity: 'error',
      message: `question "${id}": askOnce must be a boolean when set.`,
      detail: id,
    });
  }
  if ('answerFreshnessDays' in q) {
    const n = q.answerFreshnessDays;
    if (typeof n !== 'number' || !Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
      findings.push({
        code: 'CANON_BAD_FRESHNESS',
        severity: 'error',
        message: `question "${id}": answerFreshnessDays must be a non-negative integer when set.`,
        detail: id,
      });
    }
  }
  for (const k of ['owner', 'introducedInVersion', 'deprecatedAt'] as const) {
    if (k in q && typeof q[k] !== 'string') {
      findings.push({
        code: 'CANON_BAD_STRING_META',
        severity: 'error',
        message: `question "${id}": ${k} must be a string when set.`,
        detail: id,
      });
    }
  }
}

function lintCanonAnswerObject(
  id: string,
  answer: unknown,
  optionCatalogs: Record<string, unknown> | undefined,
  findings: LintFinding[],
): void {
  if (answer == null || typeof answer !== 'object' || Array.isArray(answer)) {
    findings.push({
      code: 'CANON_ANSWER_NOT_OBJECT',
      severity: 'error',
      message: `question "${id}": answer must be an object.`,
      detail: id,
    });
    return;
  }
  const a = answer as Record<string, unknown>;
  const t = a.type;
  if (typeof t !== 'string' || !CANON_ANSWER_TYPES.has(t)) {
    findings.push({
      code: 'CANON_ANSWER_BAD_TYPE',
      severity: 'error',
      message: `question "${id}": answer.type must be one of ${[...CANON_ANSWER_TYPES].join(', ')}.`,
      detail: id,
    });
    return;
  }
  const hasOpts = Array.isArray(a.options) && a.options.length > 0 && a.options.every(x => typeof x === 'string');
  const ref = typeof a.optionsRef === 'string' && a.optionsRef.trim() !== '' ? a.optionsRef.trim() : '';
  if (t === 'single_select' || t === 'multi_select') {
    const hasRef = ref.length > 0;
    if ((hasOpts && hasRef) || (!hasOpts && !hasRef)) {
      findings.push({
        code: 'CANON_ANSWER_SELECT_XOR',
        severity: 'error',
        message: `question "${id}": ${t} must have exactly one of options (non-empty string[]) or optionsRef.`,
        detail: id,
      });
    }
    if (ref) {
      const cat = optionCatalogs?.[ref];
      if (!Array.isArray(cat) || !cat.every(x => typeof x === 'string') || cat.length === 0) {
        findings.push({
          code: 'CANON_ANSWER_BAD_OPTIONS_REF',
          severity: 'error',
          message: `question "${id}": optionsRef "${ref}" must name a non-empty string array in optionCatalogs.`,
          detail: id,
        });
      }
    }
  } else {
    if ('options' in a || 'optionsRef' in a) {
      findings.push({
        code: 'CANON_ANSWER_EXTRA_OPTIONS',
        severity: 'error',
        message: `question "${id}": answer type "${t}" must not set options/optionsRef.`,
        detail: id,
      });
    }
  }
  if (t === 'text' || t === 'textarea') {
    if ('maxLength' in a) {
      const m = a.maxLength;
      if (typeof m !== 'number' || !Number.isInteger(m) || m < 1 || m > 12_000) {
        findings.push({
          code: 'CANON_ANSWER_BAD_MAX_LENGTH',
          severity: 'error',
          message: `question "${id}": maxLength must be an integer 1..12000 for text/textarea.`,
          detail: id,
        });
      }
    }
    if ('minLength' in a) {
      const m = a.minLength;
      if (typeof m !== 'number' || !Number.isInteger(m) || m < 0) {
        findings.push({
          code: 'CANON_ANSWER_BAD_MIN_LENGTH',
          severity: 'error',
          message: `question "${id}": minLength must be a non-negative integer when set.`,
          detail: id,
        });
      }
    }
  }
  if (t === 'scale') {
    const lo = a.scaleMin;
    const hi = a.scaleMax;
    if (typeof lo !== 'number' || typeof hi !== 'number' || !Number.isInteger(lo) || !Number.isInteger(hi) || lo >= hi) {
      findings.push({
        code: 'CANON_ANSWER_BAD_SCALE',
        severity: 'error',
        message: `question "${id}": scale requires integer scaleMin < scaleMax.`,
        detail: id,
      });
    }
  }
}

/**
 * question-bank.v1.json: only known keys per question row; every row must have a unique non-empty `reportUse` (ADR Phase E).
 */
export function lintCanonQuestionMetadataKeys(
  bankPath: string = join(CORE_DIR, '..', 'question-bank.v1.json'),
): LintFinding[] {
  const findings: LintFinding[] = [];
  try {
    const raw = JSON.parse(readFileSync(bankPath, 'utf8')) as {
      version?: unknown;
      optionCatalogs?: unknown;
      questions?: Array<Record<string, unknown>>;
    };
    const rootAllowed = new Set(['version', 'optionCatalogs', 'questions']);
    for (const key of Object.keys(raw)) {
      if (!rootAllowed.has(key)) {
        findings.push({
          code: 'CANON_UNKNOWN_ROOT_KEY',
          severity: 'error',
          message: `question-bank.v1.json has unknown root key "${key}".`,
          detail: key,
        });
      }
    }
    if (typeof raw.version !== 'string' || raw.version.trim() === '') {
      findings.push({
        code: 'CANON_MISSING_VERSION',
        severity: 'error',
        message: 'question-bank.v1.json must declare a non-empty string version.',
      });
    }
    let optionCatalogs: Record<string, unknown> | undefined;
    if (raw.optionCatalogs !== undefined) {
      if (raw.optionCatalogs === null || typeof raw.optionCatalogs !== 'object' || Array.isArray(raw.optionCatalogs)) {
        findings.push({
          code: 'CANON_BAD_OPTION_CATALOGS',
          severity: 'error',
          message: 'question-bank.v1.json optionCatalogs must be an object of string arrays.',
        });
      } else {
        optionCatalogs = raw.optionCatalogs as Record<string, unknown>;
        for (const [ck, val] of Object.entries(optionCatalogs)) {
          if (!Array.isArray(val) || !val.every(x => typeof x === 'string')) {
            findings.push({
              code: 'CANON_BAD_OPTION_CATALOG_ENTRY',
              severity: 'error',
              message: `optionCatalogs."${ck}" must be an array of strings.`,
              detail: ck,
            });
          }
        }
      }
    }
    const rows = raw.questions ?? [];
    if (!Array.isArray(rows)) {
      findings.push({
        code: 'CANON_QUESTIONS_NOT_ARRAY',
        severity: 'error',
        message: 'question-bank.v1.json questions must be an array.',
      });
      return findings;
    }
    const reportUseFirstId = new Map<string, string>();
    for (const q of rows) {
      const id = typeof q.id === 'string' ? q.id : '?';
      for (const key of Object.keys(q)) {
        if (!CANON_QUESTION_JSON_KEYS.has(key)) {
          findings.push({
            code: 'CANON_UNKNOWN_QUESTION_KEY',
            severity: 'error',
            message: `question-bank.v1.json question "${id}" has unknown key "${key}" (extend CANON_QUESTION_JSON_KEYS in lint-bank-policy if intentional).`,
            detail: id,
          });
        }
      }
      lintCanonOptionalQuestionMetadata(id, q, findings);
      if (!('answer' in q) || q.answer == null) {
        findings.push({
          code: 'CANON_MISSING_ANSWER',
          severity: 'error',
          message: `question "${id}" must declare an answer object (canon contract).`,
          detail: id,
        });
      } else {
        lintCanonAnswerObject(id, q.answer, optionCatalogs, findings);
      }
      const ru = q.reportUse;
      if (typeof ru !== 'string' || ru.trim() === '') {
        findings.push({
          code: 'CANON_MISSING_REPORT_USE',
          severity: 'error',
          message: `question "${id}" must declare a non-empty reportUse string (unique anchor tag for derivedFacts.reportAnchors).`,
          detail: id,
        });
        continue;
      }
      const tag = ru.trim();
      const first = reportUseFirstId.get(tag);
      if (first !== undefined && first !== id) {
        findings.push({
          code: 'CANON_DUPLICATE_REPORT_USE',
          severity: 'error',
          message: `reportUse tag "${tag}" is reused by "${id}" and "${first}" (anchors would collide in plan-derived).`,
          detail: `${tag}:${id}`,
        });
      } else {
        reportUseFirstId.set(tag, id);
      }
    }
  } catch (e) {
    findings.push({
      code: 'CANON_BANK_JSON_READ',
      severity: 'error',
      message: `Could not lint question-bank.v1.json: ${(e as Error).message}`,
    });
  }
  return findings;
}

/**
 * Every id in pre_brief.bankIncluded must also appear in express.requiredAlways,
 * express.requiredIfVisible, or be an all_eligible bank question. An id that
 * branch-gates to hidden in all express-visible contexts creates a ghost required
 * slot that can never be satisfied.
 *
 * Detects: ids in bankIncluded that are not in the express required lists AND have
 * a branchCondition (may be hidden). Warns rather than errors because branch
 * evaluation is runtime-dependent, but surfaces candidates for manual review.
 */
export function lintPreBriefBankIncludedBranchConflicts(
  policy: IntakePolicyV1 = INTAKE_POLICY_V1,
  stubs: IntakeQuestionStub[] = QUESTION_BANK_V1_STUBS,
): LintFinding[] {
  const findings: LintFinding[] = [];
  const bankIncluded = policy.modes.pre_brief.bankIncluded ?? [];
  if (bankIncluded.length === 0) return findings;

  const expressRequired = new Set([
    ...policy.modes.express.requiredAlways,
    ...policy.modes.express.requiredIfVisible,
  ]);
  const branchById = new Map(stubs.map(s => [s.id, s.branchCondition]));

  for (const id of bankIncluded) {
    if (expressRequired.has(id)) continue;
    const branch = branchById.get(id);
    if (branch) {
      findings.push({
        code: 'PRE_BRIEF_BANK_INCLUDED_BRANCH_GATED',
        severity: 'warn',
        message: `pre_brief.bankIncluded "${id}" has branchCondition "${branch}" and is not in express required lists — may be hidden at runtime and never satisfiable.`,
        detail: id,
      });
    }
  }
  return findings;
}

export function lintBankAndPolicyAll(): LintFinding[] {
  return [
    ...lintCanonQuestionMetadataKeys(),
    ...lintUnknownBranchRefs(),
    ...lintMissingPolicyCoverage(),
    ...lintOrphanPolicyDiscoveryIds(),
    ...lintOrphanPolicyPreBriefBankIds(),
    ...lintPreBriefBankIncludedJsonMatchesPolicy(),
    ...lintPreBriefBankIncludedBranchConflicts(),
    ...lintLayoutReferencesUnknownBankIds(),
    ...lintDuplicateDiscoveryIncluded(),
    ...lintSyntheticCollision(),
    ...lintDeprecatedStillRequired(),
    ...lintForbiddenImportsInCore(),
  ];
}
