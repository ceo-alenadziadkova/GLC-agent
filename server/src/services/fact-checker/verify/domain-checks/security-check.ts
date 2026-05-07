import { FACT_CHECKER_THRESHOLDS } from '../../../../config/fact-checker-thresholds.js';
import { factCheckerCopy, interpolateFactCheckerMessage } from '../../../../config/fact-checker-copy.js';
import type { DomainResult } from '../../../../types/audit.js';
import type { FactCorrection } from '../../types.js';

const T = FACT_CHECKER_THRESHOLDS;

export function checkSecurity(
  result: DomainResult,
  collected: Record<string, Record<string, unknown>>,
  corrections: FactCorrection[],
): void {
  const secData = collected['security_headers'];
  if (!secData) return;

  const ssl = secData.ssl as {
    valid: boolean;
    redirects_to_https?: boolean;
    verification_status?: 'confirmed' | 'unverified' | 'not_assessed';
  } | undefined;
  const headers = secData.headers as Array<{ name: string; present: boolean }> | undefined;
  const cookies = secData.cookies as { issues?: string[] } | undefined;

  const secCopy = factCheckerCopy().security;

  if (ssl && ssl.verification_status === 'confirmed' && !ssl.valid) {
    corrections.push({
      field: 'score',
      issue: secCopy.invalidSslIssue,
      raw_evidence: secCopy.invalidSslRawEvidence,
      action: 'override',
      original_value: result.score,
      corrected_value: Math.min(result.score, T.security.invalidSslMaxScore),
    });
  }

  if (ssl?.valid && ssl.redirects_to_https === false && result.score >= T.security.missingCriticalHeadersFlagMinScore) {
    corrections.push({
      field: 'score',
      issue: secCopy.noHttpsRedirectIssue,
      raw_evidence: secCopy.noHttpsRedirectRawEvidence,
      action: 'flag',
    });
  }

  if (headers) {
    const missingCritical = headers.filter(
      h =>
        ['Content-Security-Policy', 'Strict-Transport-Security'].some(name => h.name.includes(name)) &&
        !h.present,
    );

    if (
      missingCritical.length >= T.security.missingCriticalHeadersMinCount &&
      result.score >= T.security.missingCriticalHeadersFlagMinScore
    ) {
      corrections.push({
        field: 'score',
        issue: interpolateFactCheckerMessage(secCopy.missingCriticalIssueTemplate, {
          count: missingCritical.length,
        }),
        raw_evidence: interpolateFactCheckerMessage(secCopy.missingCriticalRawEvidenceTemplate, {
          names: missingCritical.map(h => h.name).join(', '),
        }),
        action: 'flag',
      });
    }

    const missingBaseline = headers.filter(
      h =>
        ['X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy', 'Permissions-Policy'].includes(h.name) &&
        !h.present,
    );

    if (
      missingBaseline.length >= T.security.baselineHeadersMinCount &&
      result.score >= T.security.missingCriticalHeadersFlagMinScore
    ) {
      corrections.push({
        field: 'score',
        issue: interpolateFactCheckerMessage(secCopy.baselineHeadersIssueTemplate, {
          count: missingBaseline.length,
        }),
        raw_evidence: interpolateFactCheckerMessage(secCopy.baselineHeadersRawEvidenceTemplate, {
          names: missingBaseline.map(h => h.name).join(', '),
        }),
        action: 'flag',
      });
    }

    const hygieneFailures = headers.filter(
      h =>
        ['X-Powered-By (should be absent)', 'Server (should be minimal)'].includes(h.name) && !h.present,
    );

    if (
      hygieneFailures.length >= T.security.hygieneHeadersMinCount &&
      result.score >= T.security.missingCriticalHeadersFlagMinScore
    ) {
      corrections.push({
        field: 'score',
        issue: interpolateFactCheckerMessage(secCopy.headerHygieneIssueTemplate, {
          count: hygieneFailures.length,
        }),
        raw_evidence: interpolateFactCheckerMessage(secCopy.headerHygieneRawEvidenceTemplate, {
          names: hygieneFailures.map(h => h.name).join(', '),
        }),
        action: 'flag',
      });
    }
  }

  const cookieIssues = cookies?.issues ?? [];
  if (cookieIssues.length >= T.security.cookieIssuesMinCount && result.score >= T.security.missingCriticalHeadersFlagMinScore) {
    corrections.push({
      field: 'score',
      issue: interpolateFactCheckerMessage(secCopy.cookieFlagsIssueTemplate, {
        count: cookieIssues.length,
      }),
      raw_evidence: interpolateFactCheckerMessage(secCopy.cookieFlagsRawEvidenceTemplate, {
        issues: cookieIssues.slice(0, 3).join(' | '),
      }),
      action: 'flag',
    });
  }
}

