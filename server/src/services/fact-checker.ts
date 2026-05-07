/**
 * Fact-checker service — public entry re-export.
 *
 * Implementation lives in `./fact-checker/`. New code goes inside the folder.
 */

export {
    FactChecker,
    type BuildControlObjectGovernanceInput,
    type FactCheckResult,
    type FactCorrection,
} from './fact-checker/fact-checker.service.js';
