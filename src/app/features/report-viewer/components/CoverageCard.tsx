import { SectionLabel } from '../../../components/glc/SectionLabel';
import { DOMAIN_LABELS, type DomainKey } from '../../../data/auditTypes';
import { REPORT_VIEWER_CONSTANTS } from '../config/report-viewer.constants';
import { REPORT_VIEWER_COPY } from '../config/report-viewer.copy.en';

type CoverageCardProps = {
  coveredDomains: DomainKey[];
  missingDomains: DomainKey[];
  coverageRatio: number;
  coverageAdjustedScore: number | null;
};

function joinDomainLabels(keys: DomainKey[]): string {
  return keys.map((key) => DOMAIN_LABELS[key]).join(', ') || REPORT_VIEWER_COPY.coverage.none;
}

export function CoverageCard({
  coveredDomains,
  missingDomains,
  coverageRatio,
  coverageAdjustedScore,
}: CoverageCardProps) {
  return (
    <div className="glc-soft-panel p-4">
      <SectionLabel>{REPORT_VIEWER_COPY.sections.coverage}</SectionLabel>
      <p className="mt-2 text-[length:var(--text-sm)] text-[var(--text-secondary)]">
        {Math.round(coverageRatio * 100)}% coverage ({coveredDomains.length}/
        {REPORT_VIEWER_CONSTANTS.totalDomainCount} {REPORT_VIEWER_COPY.coverage.domainLabel}).
      </p>
      {coverageAdjustedScore !== null && (
        <p className="mt-1.5 text-[length:var(--text-xs)] text-[var(--text-tertiary)]">
          {REPORT_VIEWER_COPY.coverage.coverageAdjustedPrefix} {coverageAdjustedScore}/
          {REPORT_VIEWER_CONSTANTS.scoreMax}
        </p>
      )}
      <p className="mt-1.5 text-[length:var(--text-xs)] text-[var(--text-tertiary)]">
        {REPORT_VIEWER_COPY.coverage.coveredPrefix} {joinDomainLabels(coveredDomains)}.
      </p>
      <p className="mt-1.5 text-[length:var(--text-xs)] text-[var(--text-tertiary)]">
        {REPORT_VIEWER_COPY.coverage.notAnalyzedPrefix} {joinDomainLabels(missingDomains)}.
      </p>
      {missingDomains.length > 0 && (
        <p className="mt-2 text-[length:var(--text-xs)] text-[var(--score-2)]">
          {REPORT_VIEWER_COPY.partialCoverageNote}
        </p>
      )}
      {missingDomains.length > 0 && (
        <p className="mt-1.5 text-[length:var(--text-xs)] text-[var(--text-secondary)]">
          {REPORT_VIEWER_COPY.coverage.launchMoreDomainsHint}
        </p>
      )}
      {coveredDomains.length <= 1 && (
        <p className="mt-1.5 text-[length:var(--text-xs)] text-[var(--score-2)]">
          {REPORT_VIEWER_COPY.singleDomainNote}
        </p>
      )}
    </div>
  );
}
