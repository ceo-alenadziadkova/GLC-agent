import { useEffect, useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router';
import {
  FileText, ArrowsClockwise,
  DownloadSimple,
} from '@phosphor-icons/react';
import { AppShell } from '../components/AppShell';
import { StatusPill } from '../components/glc/StatusPill';
import { useAudit } from '../hooks/useAudit';
import { ReportHeroCard } from '../features/report-viewer/components/ReportHeroCard';
import { DomainScorecard } from '../features/report-viewer/components/DomainScorecard';
import { ReportFindings } from '../features/report-viewer/components/ReportFindings';
import { Button } from '../components/ui/button';
import { REPORT_VIEWER_COPY } from '../features/report-viewer/config/report-viewer.copy.en';
import { REPORT_VIEWER_CONSTANTS } from '../features/report-viewer/config/report-viewer.constants';
import { APP_ROUTE_PATHS } from '../config/route-paths';
import {
  getReportPageViewModel,
} from '../features/report-viewer/domain/selectors';
import { downloadReportCsv, downloadReportPdf } from '../features/report-viewer/services/report-export.client';
import { CollapsibleSection } from '../components/CollapsibleSection';
import { toast } from 'sonner';
import { toUiApiErrorMessage } from '../lib/api-error-ui';

export function ReportViewer() {
  const { id } = useParams<{ id: string }>();
  const { pathname } = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { audit, loading, error, reload } = useAudit(id);
  const profile = 'full' as const;
  const [csvLoading, setCsvLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [sectionOpenState, setSectionOpenState] = useState({
    scorecard: true,
    findings: true,
  });

  async function handleExportPdf() {
    if (!id) return;
    setPdfLoading(true);
    try {
      await downloadReportPdf(id, profile);
    } catch (error) {
      toast.error(toUiApiErrorMessage(error, REPORT_VIEWER_COPY.errors.exportPdfFailed));
    } finally {
      setPdfLoading(false);
    }
  }

  async function handleDownloadCsv() {
    if (!id) return;
    setCsvLoading(true);
    try {
      await downloadReportCsv(id, profile);
    } catch (error) {
      toast.error(toUiApiErrorMessage(error, REPORT_VIEWER_COPY.errors.exportCsvFailed));
    } finally {
      setCsvLoading(false);
    }
  }

  useEffect(() => {
    if (!searchParams.has('profile')) {
      return;
    }
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('profile');
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  if (loading && !audit) {
    return (
      <AppShell title={REPORT_VIEWER_COPY.pageTitle} subtitle={REPORT_VIEWER_COPY.loadingSubtitle}>
        <div className="flex h-64 items-center justify-center" role="status" aria-live="polite">
          <ArrowsClockwise className="w-6 h-6 animate-spin ds-text-brand"  />
          <span className="sr-only">{REPORT_VIEWER_COPY.loadingSubtitle}</span>
        </div>
      </AppShell>
    );
  }

  if (error || !audit) {
    const isPortalReport = pathname.startsWith('/portal/reports/');
    const safeFallbackPath = isPortalReport ? APP_ROUTE_PATHS.portal : APP_ROUTE_PATHS.dashboard;
    return (
      <AppShell title={REPORT_VIEWER_COPY.pageTitle} subtitle={REPORT_VIEWER_COPY.errorSubtitle}>
        <div className="flex h-64 flex-col items-center justify-center gap-3">
          <p className="ds-text-score-1">{error || REPORT_VIEWER_COPY.reportNotFound}</p>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={reload}>
              <ArrowsClockwise className="w-4 h-4" />
              {REPORT_VIEWER_COPY.buttons.retry}
            </Button>
            <Button asChild variant="ghost">
              <Link to={safeFallbackPath}>{REPORT_VIEWER_COPY.buttons.backToWorkspace}</Link>
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  const reportVm = getReportPageViewModel(audit, profile);
  const maxItems = REPORT_VIEWER_CONSTANTS.profileMaxItems[profile];
  const isPortalReport = pathname.startsWith('/portal/reports/');

  function updateSectionOpenState(
    key: keyof typeof sectionOpenState,
    isOpen: boolean,
  ) {
    setSectionOpenState((previous) => ({ ...previous, [key]: isOpen }));
  }

  function buildDomainHref(auditId: string, domainKey: string): string {
    if (isPortalReport) {
      return buildAppRoute.portalAudit(auditId);
    }
    return `/audit/${auditId}/${domainKey}`;
  }

  return (
    <AppShell
      title={REPORT_VIEWER_COPY.pageTitle}
      subtitle={`${REPORT_VIEWER_COPY.pageSubtitlePrefix} · ${reportVm.companyName}`}
      actions={
        <div className="flex items-center gap-2">
          <StatusPill
            status={
              audit.meta.status === 'completed'
                ? 'completed'
                : audit.meta.status === 'cancelled'
                  ? 'cancelled'
                  : 'running'
            }
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleDownloadCsv}
            disabled={csvLoading}
            title={REPORT_VIEWER_COPY.buttons.actionPlanCsvTitle}
            aria-label={REPORT_VIEWER_COPY.buttons.actionPlanCsvTitle}
            aria-busy={csvLoading}
          >
            <span className="sr-only" aria-live="polite">
              {csvLoading ? REPORT_VIEWER_COPY.status.generating : ''}
            </span>
            <DownloadSimple className="w-4 h-4" />
            <span className="hidden sm:inline">
              {csvLoading ? REPORT_VIEWER_COPY.status.generating : REPORT_VIEWER_COPY.buttons.actionPlanCsv}
            </span>
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleExportPdf}
            disabled={pdfLoading}
            title={REPORT_VIEWER_COPY.buttons.exportPdfTitle}
            aria-label={REPORT_VIEWER_COPY.buttons.exportPdfTitle}
            aria-busy={pdfLoading}
          >
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">
              {pdfLoading ? REPORT_VIEWER_COPY.status.generating : REPORT_VIEWER_COPY.buttons.exportPdf}
            </span>
          </Button>
        </div>
      }
    >
      <div className="max-w-3xl mx-auto ds-pattern-page-shell-body space-y-5">
        <div className="space-y-5">
          <div id={REPORT_VIEWER_CONSTANTS.sectionAnchors.hero}>
            <ReportHeroCard
              companyName={reportVm.companyName}
              industry={audit.meta.industry}
              createdAt={audit.meta.created_at}
              executiveSummary={reportVm.executiveSummary}
              averageScore={reportVm.averageScore}
              criticalIssueCount={reportVm.criticalIssues.length}
              quickWinsCount={reportVm.allQuickWins.length}
            />
          </div>

          <CollapsibleSection
            id={REPORT_VIEWER_CONSTANTS.sectionAnchors.scorecard}
            title={REPORT_VIEWER_COPY.sections.scorecard}
            defaultOpen
            isOpen={sectionOpenState.scorecard}
            onToggle={(isOpen) => updateSectionOpenState('scorecard', isOpen)}
            summary={`${reportVm.visibleDomainEntries.length}/${REPORT_VIEWER_CONSTANTS.totalDomainCount} domains`}
            headerExtra={
              <span className="text-sm ds-text-tertiary">
                {sectionOpenState.scorecard ? REPORT_VIEWER_COPY.collapsible.collapseLabel : REPORT_VIEWER_COPY.collapsible.expandLabel}
              </span>
            }
            className="mb-0"
          >
            <DomainScorecard
              auditId={id}
              domains={reportVm.profileDomains}
              domainEntriesCount={reportVm.visibleDomainEntries.length}
              isFilteredProfile={profile !== 'full'}
              averageScore={reportVm.averageScore}
              buildDomainHref={buildDomainHref}
            />
          </CollapsibleSection>

          <CollapsibleSection
            id={REPORT_VIEWER_CONSTANTS.sectionAnchors.findings}
            title={REPORT_VIEWER_COPY.sections.criticalIssues}
            defaultOpen
            isOpen={sectionOpenState.findings}
            onToggle={(isOpen) => updateSectionOpenState('findings', isOpen)}
            summary={`${reportVm.criticalIssues.length} critical · ${reportVm.allQuickWins.length} quick wins`}
            headerExtra={
              <span className="text-sm ds-text-tertiary">
                {sectionOpenState.findings ? REPORT_VIEWER_COPY.collapsible.collapseLabel : REPORT_VIEWER_COPY.collapsible.expandLabel}
              </span>
            }
            className="mb-0"
          >
            <ReportFindings
              strengths={reportVm.allStrengths}
              criticalIssues={reportVm.criticalIssues}
              quickWins={reportVm.allQuickWins}
              maxItems={maxItems}
            />
          </CollapsibleSection>
        </div>
      </div>
    </AppShell>
  );
}
