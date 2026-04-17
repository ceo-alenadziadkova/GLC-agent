import { useState, type ElementType } from 'react';
import { Link, useParams } from 'react-router';
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
import { REPORT_VIEWER_COPY } from '../features/report-viewer/config/report-viewer.copy.en';
import { REPORT_VIEWER_CONSTANTS } from '../features/report-viewer/config/report-viewer.constants';
import {
  getReportPageViewModel,
  getReportProfileOptions,
} from '../features/report-viewer/domain/selectors';
import { downloadReportCsv, downloadReportPdf } from '../features/report-viewer/services/report-export.client';

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
          <ArrowsClockwise className="w-6 h-6 animate-spin" style={{ color: 'var(--glc-blue)' }} />
        </div>
      </AppShell>
    );
  }

  if (error || !audit) {
    return (
      <AppShell title={REPORT_VIEWER_COPY.pageTitle} subtitle={REPORT_VIEWER_COPY.errorSubtitle}>
        <div className="flex items-center justify-center h-64">
          <p style={{ color: 'var(--score-1)' }}>{error || REPORT_VIEWER_COPY.reportNotFound}</p>
        </div>
      </AppShell>
    );
  }

  const reportVm = getReportPageViewModel(audit, profile);
  const maxItems = REPORT_VIEWER_CONSTANTS.profileMaxItems[profile];

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
          <button
            type="button"
            className="glc-btn-secondary"
            onClick={handleDownloadCsv}
            disabled={csvLoading}
            title={REPORT_VIEWER_COPY.buttons.actionPlanCsvTitle}
          >
            <DownloadSimple className="w-4 h-4" />
            {csvLoading ? REPORT_VIEWER_COPY.status.generating : REPORT_VIEWER_COPY.buttons.actionPlanCsv}
          </button>
          <button
            type="button"
            className="glc-btn-secondary"
            onClick={handleExportPdf}
            disabled={pdfLoading}
            title={REPORT_VIEWER_COPY.buttons.exportPdfTitle}
          >
            <FileText className="w-4 h-4" />
            {pdfLoading ? REPORT_VIEWER_COPY.status.generating : REPORT_VIEWER_COPY.buttons.exportPdf}
          </button>
        </div>
      }
    >
      <div className="max-w-3xl mx-auto px-7 py-6 space-y-6">
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

        {/* Strategy link */}
        {audit.strategy && (
          <div className="text-center">
            <Link
              to={`/strategy/${id}`}
              className="glc-btn-secondary inline-flex"
              style={{ textDecoration: 'none' }}
            >
              {REPORT_VIEWER_COPY.buttons.viewStrategyLab} <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </AppShell>
  );
}
