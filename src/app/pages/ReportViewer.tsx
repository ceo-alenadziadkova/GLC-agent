import { useState, type ElementType } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import {
  ArrowUpRight, FileText, ArrowsClockwise,
  DownloadSimple, User, Code, Megaphone, Article, ChartBar,
} from '@phosphor-icons/react';
import { AppShell } from '../components/AppShell';
import { StatusPill } from '../components/glc/StatusPill';
import { useAudit } from '../hooks/useAudit';
import { type ReportProfile } from '@glc/intake-core';
import { ProfileTabs } from '../features/report-viewer/components/ProfileTabs';
import { ReportHeroCard } from '../features/report-viewer/components/ReportHeroCard';
import { CoverageCard } from '../features/report-viewer/components/CoverageCard';
import { DomainScorecard } from '../features/report-viewer/components/DomainScorecard';
import { ReportFindings } from '../features/report-viewer/components/ReportFindings';
import { FollowUpCard } from '../features/report-viewer/components/FollowUpCard';
import { ReportOrchestrationRoadmapSection } from '../features/report-viewer/components/ReportOrchestrationRoadmapSection';
import { ReportRoadmapCockpitSection } from '../features/report-viewer/components/ReportRoadmapCockpitSection';
import { Button } from '../components/ui/button';
import { APP_FEATURE_FLAGS } from '../config/app-feature-flags';
import { isGlcOrchestrationPackView } from '../lib/orchestration-pack-guards';
import { REPORT_VIEWER_COPY } from '../features/report-viewer/config/report-viewer.copy.en';
import { REPORT_VIEWER_CONSTANTS } from '../features/report-viewer/config/report-viewer.constants';
import { ORCHESTRATION_MANIFEST_SETUP_DOM_ID, ORCHESTRATION_PANEL_DOM_ID } from '../config/orchestration-ui-limits';
import { buildAppRoute } from '../config/route-paths';
import { PIPELINE_UI_COPY } from '../config/pipeline-ui-copy.en';
import {
  getReportPageViewModel,
  getReportProfileOptions,
} from '../features/report-viewer/domain/selectors';
import { downloadReportCsv, downloadReportPdf } from '../features/report-viewer/services/report-export.client';
import { ExecutionLogPanel } from '../components/pipeline/ExecutionLogPanel';

const PROFILE_ICONS: Record<ReportProfile, ElementType> = {
  full: ChartBar,
  owner: User,
  tech: Code,
  marketing: Megaphone,
  onepager: Article,
};

const PROFILES = getReportProfileOptions(PROFILE_ICONS);

export function ReportViewer() {
  const { id } = useParams<{ id: string }>();
  const { pathname } = useLocation();
  const { audit, loading, error } = useAudit(id);
  const [profile, setProfile] = useState<ReportProfile>('full');
  const [csvLoading, setCsvLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  async function handleExportPdf() {
    if (!id) return;
    setPdfLoading(true);
    try {
      await downloadReportPdf(id, profile);
    } catch {
      // Error already logged in report export client.
    } finally {
      setPdfLoading(false);
    }
  }

  async function handleDownloadCsv() {
    if (!id) return;
    setCsvLoading(true);
    try {
      await downloadReportCsv(id, profile);
    } catch {
      // Error already logged in report export client.
    } finally {
      setCsvLoading(false);
    }
  }

  if (loading && !audit) {
    return (
      <AppShell title={REPORT_VIEWER_COPY.pageTitle} subtitle={REPORT_VIEWER_COPY.loadingSubtitle}>
        <div className="flex items-center justify-center h-64">
          <ArrowsClockwise className="w-6 h-6 animate-spin ds-text-brand"  />
        </div>
      </AppShell>
    );
  }

  if (error || !audit) {
    return (
      <AppShell title={REPORT_VIEWER_COPY.pageTitle} subtitle={REPORT_VIEWER_COPY.errorSubtitle}>
        <div className="flex items-center justify-center h-64">
          <p className="ds-text-score-1">{error || REPORT_VIEWER_COPY.reportNotFound}</p>
        </div>
      </AppShell>
    );
  }

  const reportVm = getReportPageViewModel(audit, profile);
  const maxItems = REPORT_VIEWER_CONSTANTS.profileMaxItems[profile];
  const isPortalReport = pathname.startsWith('/portal/reports/');
  const strategyPath = isPortalReport ? buildAppRoute.portalStrategy(id ?? '') : buildAppRoute.strategy(id ?? '');
  const timelinePath = isPortalReport ? buildAppRoute.portalPlan(id ?? '', 'timeline') : buildAppRoute.plan(id ?? '', 'timeline');
  const timelineManifestPath = `${timelinePath}#${ORCHESTRATION_MANIFEST_SETUP_DOM_ID}`;
  const timelineComparePath = `${timelinePath}#${ORCHESTRATION_PANEL_DOM_ID}`;
  const hasOrchestrationPack = isGlcOrchestrationPackView(audit.strategy?.glc_orchestration_pack);

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
          <Button type="button" variant="outline" onClick={handleDownloadCsv} disabled={csvLoading} title={REPORT_VIEWER_COPY.buttons.actionPlanCsvTitle}>
            <DownloadSimple className="w-4 h-4" />
            {csvLoading ? REPORT_VIEWER_COPY.status.generating : REPORT_VIEWER_COPY.buttons.actionPlanCsv}
          </Button>
          <Button type="button" variant="outline" onClick={handleExportPdf} disabled={pdfLoading} title={REPORT_VIEWER_COPY.buttons.exportPdfTitle}>
            <FileText className="w-4 h-4" />
            {pdfLoading ? REPORT_VIEWER_COPY.status.generating : REPORT_VIEWER_COPY.buttons.exportPdf}
          </Button>
        </div>
      }
    >
      <div className="max-w-3xl mx-auto ds-pattern-page-shell-body space-y-6">
        <ProfileTabs options={PROFILES} profile={profile} onSelect={setProfile} />

        <ReportHeroCard
          companyName={reportVm.companyName}
          industry={audit.meta.industry}
          createdAt={audit.meta.created_at}
          executiveSummary={reportVm.executiveSummary}
          averageScore={reportVm.averageScore}
          criticalIssueCount={reportVm.criticalIssues.length}
          quickWinsCount={reportVm.allQuickWins.length}
        />

        <CoverageCard
          coveredDomains={reportVm.coverage.coveredDomains}
          missingDomains={reportVm.coverage.missingDomains}
          coverageRatio={reportVm.coverage.coverageRatio}
          coverageAdjustedScore={reportVm.coverage.coverageAdjustedScore}
        />

        {APP_FEATURE_FLAGS.orchestrationRoadmapUiEnabled && (
          <ReportRoadmapCockpitSection
            audit={audit}
            reportVm={reportVm}
            timelineHref={timelinePath}
            manifestHref={timelineManifestPath}
            compareHref={timelineComparePath}
            hasOrchestrationPack={hasOrchestrationPack}
          />
        )}

        {APP_FEATURE_FLAGS.orchestrationRoadmapUiEnabled && (
          <ReportOrchestrationRoadmapSection
            strategy={audit.strategy}
            strategyLabHref={strategyPath}
            laneDisplayPreset={isPortalReport ? 'client_mvp' : 'full'}
            selectedDomains={audit.meta.execution_plan?.selected_domains ?? null}
          />
        )}

        <DomainScorecard
          auditId={id}
          domains={reportVm.profileDomains}
          domainEntriesCount={reportVm.visibleDomainEntries.length}
          isFilteredProfile={profile !== 'full'}
          averageScore={reportVm.averageScore}
        />

        <ReportFindings
          strengths={reportVm.allStrengths}
          criticalIssues={reportVm.criticalIssues}
          quickWins={reportVm.allQuickWins}
          maxItems={maxItems}
        />

        <FollowUpCard
          followUpQuestionsCount={reportVm.followUpQuestions.length}
          answeredFollowUps={reportVm.answeredFollowUps}
        />
        <ExecutionLogPanel auditId={id} title={PIPELINE_UI_COPY.executionLogTitles.reportViewer} compact />

        {/* Timeline-first link */}
        {audit.strategy && (
          <div className="text-center">
            <Button asChild variant="outline" className="inline-flex no-underline">
              <Link to={timelinePath}>
                {REPORT_VIEWER_COPY.buttons.viewTimeline}{' '}
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
