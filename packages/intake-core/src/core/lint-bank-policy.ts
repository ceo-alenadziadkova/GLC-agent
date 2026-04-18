/**
 * Static checks for question bank + intake policy (Phase 3). Isomorphic (no Node fs).
 * For CI filesystem scan of `core/*.ts`, use `lintBankAndPolicyAll` from `@glc/intake-core/lint-node`.
 */
export * from './lint-bank-policy/index.js';
