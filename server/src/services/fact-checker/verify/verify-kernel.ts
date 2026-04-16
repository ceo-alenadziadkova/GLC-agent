import type { DomainKey, DomainResult } from '../../../types/audit.js';
import type { FactCheckResult, FactCorrection } from '../types.js';
import { calculateConfidence } from './confidence.js';
import { applyCorrections } from './apply-corrections.js';
import { checkScoreConsistency } from './score-consistency.js';
import { checkSecurity } from './domain-checks/security-check.js';
import { checkSeo } from './domain-checks/seo-check.js';
import { checkTech } from './domain-checks/tech-check.js';
import { checkUx } from './domain-checks/ux-check.js';
import { checkMarketing } from './domain-checks/marketing-check.js';
import { checkAutomation } from './domain-checks/automation-check.js';

export type DomainCollectorCheck = (
  result: DomainResult,
  collected: Record<string, Record<string, unknown>>,
  corrections: FactCorrection[],
) => void;

const domainCollectorChecks: Partial<Record<DomainKey, DomainCollectorCheck>> = {
  security_compliance: (result, collected, corrections) => checkSecurity(result, collected, corrections),
  seo_digital: (result, collected, corrections) => checkSeo(result, collected, corrections),
  tech_infrastructure: (result, collected, corrections) => checkTech(result, collected, corrections),
  ux_conversion: (result, collected, corrections) => checkUx(result, collected, corrections),
  marketing_utp: (result, collected, corrections) => checkMarketing(result, collected, corrections),
  automation_processes: (result, collected, corrections) => checkAutomation(result, collected, corrections),
};

export function verifyKernel(args: {
  result: DomainResult;
  domainKey: DomainKey;
  collectedData: Record<string, Record<string, unknown>>;
}): FactCheckResult {
  const corrections: FactCorrection[] = [];

  const domainHook = domainCollectorChecks[args.domainKey];
  if (domainHook) {
    domainHook(args.result, args.collectedData, corrections);
  }

  // General checks
  checkScoreConsistency(args.result, corrections);

  // Calculate confidence before applying corrections (confidence should reflect original finding confidences)
  const confidence = calculateConfidence(args.result, corrections);

  return {
    result: applyCorrections(args.result, corrections),
    corrections,
    confidence,
  };
}

