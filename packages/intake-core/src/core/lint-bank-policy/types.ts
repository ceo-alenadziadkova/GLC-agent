export type LintSeverity = 'error' | 'warn';

export interface LintFinding {
  code: string;
  severity: LintSeverity;
  message: string;
  detail?: string;
}
