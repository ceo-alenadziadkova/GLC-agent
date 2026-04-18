import type { ElementType } from 'react';
import type { ReportProfile } from '@glc/intake-core';
import type {
  AuditIssue,
  DomainData,
  DomainKey,
  QuickWin,
} from '../../../data/auditTypes';

export type ReportDomainViewModel = {
  key: DomainKey;
  label: string;
  data: DomainData | null;
  score: number;
};

export type ReportStrengthViewModel = {
  domain: string;
  text: string;
};

export type ReportCoverageViewModel = {
  plannedDomains: DomainKey[];
  coveredDomains: DomainKey[];
  missingDomains: DomainKey[];
  coverageRatio: number;
  coverageAdjustedScore: number | null;
};

export type ReportPageViewModel = {
  companyName: string;
  profileDomains: ReportDomainViewModel[];
  allDomains: ReportDomainViewModel[];
  averageScore: number;
  visibleDomainEntries: ReportDomainViewModel[];
  coverage: ReportCoverageViewModel;
  allIssues: AuditIssue[];
  criticalIssues: AuditIssue[];
  allStrengths: ReportStrengthViewModel[];
  allQuickWins: QuickWin[];
  followUpQuestions: Array<Record<string, unknown>>;
  answeredFollowUps: number;
  executiveSummary: string | null;
};

export type ReportProfileUiOption = {
  id: ReportProfile;
  label: string;
  icon: ElementType;
  description: string;
};
