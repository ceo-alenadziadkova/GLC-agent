import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ClipboardText, FileText, MapTrifold, Path } from '@phosphor-icons/react';

import { SectionLabel } from '../../../components/glc/SectionLabel';
import { Button } from '../../../components/ui/button';
import type { AuditState } from '../../../data/audit/contracts/state/audit-state.types';
import { CoverageCard } from '../../../features/report-viewer/components/CoverageCard';
import { getReportPageViewModel } from '../../../features/report-viewer/domain/selectors';
import { CLIENT_AUDIT_VIEW_COPY } from '../../../config/client-audit-view-copy';
import { APP_FEATURE_FLAGS } from '../../../config/app-feature-flags';
import { CLIENT_POST_AUDIT_COCKPIT_UI } from '../../../config/client-post-audit-cockpit-ui';
import { ORCHESTRATION_IA_COPY, ORCHESTRATION_UI_COPY } from '../../../config/orchestration-roadmap-ui-copy.en';
import { PORTAL_MANIFEST_WIZARD_COPY } from '../../../config/portal-manifest-wizard-copy.en';
import {
  ORCHESTRATION_LAB_FOCUS_QUERY_KEY,
  ORCHESTRATION_LAB_FOCUS_ROADMAP_VALUE,
} from '../../../config/orchestration-ui-limits';
import { STRATEGY_LAB_COPY } from '../../../config/strategy-lab-copy';
import { buildAppRoute } from '../../../config/route-paths';
import { api } from '../../../data/apiService';
import { glcKeys } from '../../../lib/glc-keys';
import { buildOrchestrationRevisionStorySummary } from '../../../lib/orchestration-revision-story';

function previewExecutiveSummary(text: string, maxChars: number): string {
  const t = text.trim();
  if (t.length <= maxChars) return t;
  return `${t.slice(0, maxChars).trimEnd()}…`;
}

function labelConstraintStage(value: string): string {
  const m = STRATEGY_LAB_COPY.constraints.optionLabels.stage as Record<string, string>;
  return m[value] ?? value;
}

function labelConstraintBudget(value: string): string {
  const m = STRATEGY_LAB_COPY.constraints.optionLabels.budget as Record<string, string>;
  return m[value] ?? value;
}

function labelConstraintTeam(value: string): string {
  const m = STRATEGY_LAB_COPY.constraints.optionLabels.team as Record<string, string>;
  return m[value] ?? value;
}

export function ClientPostAuditCockpitSection({ audit, auditId }: { audit: AuditState; auditId: string }) {
  const copy = CLIENT_AUDIT_VIEW_COPY.cockpit;
  const vm = getReportPageViewModel(audit, 'full');
  const { coverage } = vm;
  const strategy = audit.strategy;
  const timelineStatusQuery = useQuery({
    queryKey: glcKeys.timeline.detail(auditId),
    queryFn: () => api.getAuditTimeline(auditId),
    enabled: APP_FEATURE_FLAGS.clientTimelineEnabled,
    staleTime: CLIENT_POST_AUDIT_COCKPIT_UI.timelineStatusQueryStaleTimeMs,
  });
  const timelineStatus = timelineStatusQuery.data?.timeline.status ?? null;
  const summaryRaw = strategy?.executive_summary?.trim() ?? '';
  const summary =
    summaryRaw.length > 0
      ? previewExecutiveSummary(summaryRaw, CLIENT_POST_AUDIT_COCKPIT_UI.executiveSummaryPreviewMaxChars)
      : null;
  const ec = strategy?.effective_constraints;
  const roadmapVersion =
    typeof strategy?.orchestration_pack_version === 'number' && strategy.orchestration_pack_version > 0
      ? strategy.orchestration_pack_version
      : null;
  const roadmapDiff = strategy?.glc_orchestration_last_revision_diff ?? null;
  const revisionStorySummary = buildOrchestrationRevisionStorySummary(roadmapDiff);
  const diffNodesChanged = roadmapDiff ? roadmapDiff.nodes_added.length + roadmapDiff.nodes_removed.length : 0;
  const diffDependenciesChanged = roadmapDiff ? roadmapDiff.edges_added.length + roadmapDiff.edges_removed.length : 0;

  const reportHref = buildAppRoute.portalReports(auditId);
  const timelineHref = buildAppRoute.portalTimeline(auditId);
  const labHref = buildAppRoute.portalStrategy(auditId);
  const adjustScopeHref = `${labHref}?${ORCHESTRATION_LAB_FOCUS_QUERY_KEY}=${ORCHESTRATION_LAB_FOCUS_ROADMAP_VALUE}`;
  const manifestWizardHref = buildAppRoute.portalRoadmapManifest(auditId);

  return (
    <div className="glc-soft-panel space-y-5 p-5">
      <div>
        <SectionLabel>{copy.title}</SectionLabel>
        <p className="mt-1 text-[length:var(--text-sm)] text-[var(--text-secondary)]">{copy.subtitle}</p>
      </div>

      <CoverageCard
        coveredDomains={coverage.coveredDomains}
        missingDomains={coverage.missingDomains}
        coverageRatio={coverage.coverageRatio}
        coverageAdjustedScore={coverage.coverageAdjustedScore}
      />

      <div className="border-t border-[var(--border-default)] pt-4">
        <h3 className="text-[length:var(--text-xs)] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
          {copy.diagnosisTitle}
        </h3>
        {summary ? (
          <p className="mt-2 text-[length:var(--text-sm)] leading-relaxed text-[var(--text-primary)]">{summary}</p>
        ) : (
          <p className="mt-2 text-[length:var(--text-sm)] text-[var(--text-tertiary)]">{copy.noSummaryYet}</p>
        )}
      </div>

      {ec ? (
        <div className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-raised)] p-4">
          <h3 className="text-[length:var(--text-xs)] font-semibold text-[var(--text-primary)]">{copy.contextTitle}</h3>
          <dl className="mt-3 space-y-2 text-[length:var(--text-xs)] text-[var(--text-secondary)]">
            <div className="flex flex-wrap justify-between gap-2">
              <dt className="text-[var(--text-tertiary)]">{copy.stageLabel}</dt>
              <dd className="font-medium text-[var(--text-primary)]">{labelConstraintStage(ec.company_stage)}</dd>
            </div>
            <div className="flex flex-wrap justify-between gap-2">
              <dt className="text-[var(--text-tertiary)]">{copy.budgetLabel}</dt>
              <dd className="font-medium text-[var(--text-primary)]">{labelConstraintBudget(ec.budget_band)}</dd>
            </div>
            <div className="flex flex-wrap justify-between gap-2">
              <dt className="text-[var(--text-tertiary)]">{copy.teamLabel}</dt>
              <dd className="font-medium text-[var(--text-primary)]">{labelConstraintTeam(ec.team_scale)}</dd>
            </div>
          </dl>
        </div>
      ) : null}

      {!roadmapVersion ? (
        <div
          role="status"
          className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-raised)] px-4 py-3"
        >
          <h3 className="text-[length:var(--text-xs)] font-semibold text-[var(--text-primary)]">{copy.noPackCalloutTitle}</h3>
          <p className="mt-2 text-[length:var(--text-xs)] leading-relaxed text-[var(--text-secondary)]">{copy.noPackCalloutBody}</p>
          {timelineStatus === 'missing_pack' ? (
            <p className="mt-2 text-[length:var(--text-2xs)] text-[var(--text-tertiary)]">
              {ORCHESTRATION_UI_COPY.timelineDiagnosticReasonLabel}: missing_pack
            </p>
          ) : null}
        </div>
      ) : null}

      {APP_FEATURE_FLAGS.clientTimelineEnabled && roadmapVersion && timelineStatus === 'stale_manifest' ? (
        <div
          role="status"
          className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-raised)] px-4 py-3"
        >
          <h3 className="text-[length:var(--text-xs)] font-semibold text-[var(--text-primary)]">
            {copy.timelineStaleCalloutTitle}
          </h3>
          <p className="mt-2 text-[length:var(--text-xs)] leading-relaxed text-[var(--text-secondary)]">
            {ORCHESTRATION_UI_COPY.timelineStateStaleManifest}
          </p>
          <p className="mt-2 text-[length:var(--text-xs)] leading-relaxed text-[var(--text-secondary)]">
            {ORCHESTRATION_UI_COPY.timelineStaleManifestClientHint}
          </p>
          <p className="mt-2 text-[length:var(--text-2xs)] text-[var(--text-tertiary)]">
            {ORCHESTRATION_UI_COPY.timelineDiagnosticReasonLabel}: stale_manifest
          </p>
          <Button asChild variant="default" size="sm" className="mt-3 no-underline">
            <Link to={timelineHref} className="inline-flex items-center justify-center gap-2">
              <Path className="h-4 w-4" />
              {copy.openTimeline}
            </Link>
          </Button>
        </div>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button asChild variant="default" className="no-underline">
          <Link to={timelineHref} className="inline-flex items-center justify-center gap-2">
            <Path className="h-4 w-4" />
            {copy.openTimeline}
          </Link>
        </Button>
        <Button asChild variant="outline" className="no-underline">
          <Link to={reportHref} className="inline-flex items-center justify-center gap-2">
            <FileText className="h-4 w-4" />
            {copy.openFullReport}
          </Link>
        </Button>
        {strategy ? (
          <Button asChild variant="outline" className="no-underline">
            <Link to={labHref} className="inline-flex items-center justify-center gap-2">
              <MapTrifold className="h-4 w-4" />
              {copy.openLab}
            </Link>
          </Button>
        ) : null}
        {APP_FEATURE_FLAGS.orchestrationRoadmapUiEnabled &&
        APP_FEATURE_FLAGS.clientRoadmapManifestWizardEnabled &&
        strategy ? (
          <Button asChild variant="outline" className="no-underline">
            <Link to={manifestWizardHref} className="inline-flex items-center justify-center gap-2">
              <ClipboardText className="h-4 w-4" />
              {PORTAL_MANIFEST_WIZARD_COPY.shortCta}
            </Link>
          </Button>
        ) : null}
        {APP_FEATURE_FLAGS.orchestrationRoadmapUiEnabled ? (
          <Button asChild variant="outline" className="no-underline">
            <Link to={adjustScopeHref} className="inline-flex items-center justify-center gap-2">
              <MapTrifold className="h-4 w-4" />
              {copy.previewRoadmapInputs}
            </Link>
          </Button>
        ) : null}
      </div>
      <p className="text-[length:var(--text-2xs)] text-[var(--text-tertiary)]">
        {ORCHESTRATION_IA_COPY.clientCockpitTimelineFootnote}
      </p>
      {!roadmapVersion ? (
        <p className="text-[length:var(--text-2xs)] text-[var(--text-tertiary)]">{copy.openTimelineEmptyPackHint}</p>
      ) : null}
      {roadmapVersion && roadmapDiff && revisionStorySummary ? (
        <div
          role="region"
          aria-label={copy.revisionStoryTitle}
          className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-raised)] px-4 py-3"
        >
          <h3 className="text-[length:var(--text-xs)] font-semibold text-[var(--text-primary)]">
            {copy.revisionStoryTitle}
          </h3>
          <p className="mt-1 text-[length:var(--text-2xs)] text-[var(--text-tertiary)]">
            {`${copy.roadmapVersionLabel}: ${roadmapVersion} · ${copy.roadmapDiffHint} v${roadmapDiff.from_version}->v${roadmapDiff.to_version}`}
          </p>
          <p className="mt-2 text-[length:var(--text-sm)] leading-relaxed text-[var(--text-primary)]">
            {revisionStorySummary}
          </p>
          <p className="mt-2 text-[length:var(--text-2xs)] text-[var(--text-tertiary)]">{copy.revisionStoryHint}</p>
          <p className="mt-2 text-[length:var(--text-2xs)] text-[var(--text-tertiary)]">
            {copy.roadmapDiffNodesLabel}: {diffNodesChanged} · {copy.roadmapDiffDependenciesLabel}: {diffDependenciesChanged}
          </p>
        </div>
      ) : null}

      {roadmapVersion && !(roadmapDiff && revisionStorySummary) ? (
        <div className="space-y-1 text-[length:var(--text-2xs)] text-[var(--text-tertiary)]">
          <p>
            {copy.roadmapVersionLabel}: {roadmapVersion}
            {roadmapDiff ? ` · ${copy.roadmapDiffHint} v${roadmapDiff.from_version}->v${roadmapDiff.to_version}` : ''}
          </p>
          {roadmapDiff ? (
            <p>
              {copy.roadmapDiffNodesLabel}: {diffNodesChanged} · {copy.roadmapDiffDependenciesLabel}: {diffDependenciesChanged}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-raised)] p-4">
        <h3 className="text-[length:var(--text-xs)] font-semibold text-[var(--text-primary)]">{copy.adjustScopeTitle}</h3>
        <p className="mt-2 text-[length:var(--text-xs)] leading-relaxed text-[var(--text-secondary)]">{copy.adjustScopeBody}</p>
        <Button asChild variant="outline" size="sm" className="mt-3 no-underline">
          <Link to={adjustScopeHref}>{copy.adjustScopeTitle}</Link>
        </Button>
      </div>
    </div>
  );
}
