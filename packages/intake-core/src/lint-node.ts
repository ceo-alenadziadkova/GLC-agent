/**
 * CI / server entry: full bank+policy lint including filesystem scan of `core/`.
 * Browser apps should import from `@glc/intake-core` only (isomorphic linters).
 */
import {
  lintBankAndPolicyAll as lintBankAndPolicyAllIsomorphic,
  type LintFinding,
} from './core/lint-bank-policy.js';
import { lintForbiddenImportsInCore } from './core/lint-bank-policy-node.js';

export { lintForbiddenImportsInCore } from './core/lint-bank-policy-node.js';

/** Same as `lintBankAndPolicyAll` from the main package, plus `lintForbiddenImportsInCore`. */
export function lintBankAndPolicyAll(): LintFinding[] {
  return [...lintBankAndPolicyAllIsomorphic(), ...lintForbiddenImportsInCore()];
}
