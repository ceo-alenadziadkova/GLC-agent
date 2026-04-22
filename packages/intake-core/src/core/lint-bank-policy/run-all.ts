import { lintBranchRulesNotReferences, lintUnknownBranchRefs } from './lint-branch-rules.js';
import { lintCanonQuestionMetadataKeys } from './lint-canon-question-bank.js';
import { lintQuestionFeedRolesAlignBank } from './lint-feed-roles.js';
import { lintDeprecatedStillRequired } from './lint-bank-health.js';
import { lintLayoutReferencesUnknownBankIds } from './lint-layout-bank-refs.js';
import {
  lintDuplicateDiscoveryIncluded,
  lintMissingPolicyCoverage,
  lintOrphanPolicyDiscoveryIds,
  lintOrphanPolicyPreBriefBankIds,
  lintPreBriefBankIncludedBranchConflicts,
  lintPublicDiscoveryWizardOrder,
} from './lint-policy-modes.js';
import { lintSyntheticCollision } from './lint-synthetic-express.js';
import { lintCriticalSignalRegistry } from './lint-critical-signals-registry.js';
import { lintIntelligenceContractV1 } from './lint-intelligence-contract.js';
import { lintSequencingPilotGuardrails } from './lint-sequencing-pilot-guardrails.js';
import type { LintFinding } from './types.js';

/**
 * All isomorphic checks (bundler-safe). For CI, also run `lintForbiddenImportsInCore` via `@glc/intake-core/lint-node`.
 *
 * Order is stable: changing it affects which finding surfaces first in logs.
 */
export function lintBankAndPolicyAll(): LintFinding[] {
  return [
    ...lintCanonQuestionMetadataKeys(),
    ...lintBranchRulesNotReferences(),
    ...lintUnknownBranchRefs(),
    ...lintMissingPolicyCoverage(),
    ...lintOrphanPolicyDiscoveryIds(),
    ...lintOrphanPolicyPreBriefBankIds(),
    ...lintPreBriefBankIncludedBranchConflicts(),
    ...lintLayoutReferencesUnknownBankIds(),
    ...lintDuplicateDiscoveryIncluded(),
    ...lintPublicDiscoveryWizardOrder(),
    ...lintQuestionFeedRolesAlignBank(),
    ...lintSyntheticCollision(),
    ...lintCriticalSignalRegistry(),
    ...lintIntelligenceContractV1(),
    ...lintSequencingPilotGuardrails(),
    ...lintDeprecatedStillRequired(),
  ];
}
