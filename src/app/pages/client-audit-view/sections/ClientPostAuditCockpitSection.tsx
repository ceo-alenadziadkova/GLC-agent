import { Link } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { ArrowsClockwise, ClipboardText, FileText, MapTrifold, Path } from '@phosphor-icons/react';
import { toast } from 'sonner';

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

function impactTone(impact: 'high' | 'medium' | 'low'): string {
  if (impact === 'high') return 'bg-[var(--status-error-bg)] text-[var(--status-error-fg)]';
  if (impact === 'medium') return 'bg-[var(--status-warning-bg)] text-[var(--status-warning-fg)]';
  return 'bg-[var(--status-info-bg)] text-[var(--status-info-fg)]';
}

function effortTone(effort: 'high' | 'medium' | 'low'): string {
  if (effort === 'high') return 'bg-[var(--status-warning-bg)] text-[var(--status-warning-fg)]';
  if (effort === 'medium') return 'bg-[var(--surface-muted)] text-[var(--text-secondary)]';
  return 'bg-[var(--status-success-bg)] text-[var(--status-success-fg)]';
}

export function ClientPostAuditCockpitSection({ audit, auditId }: { audit: AuditState; auditId: string }) {
  const queryClient = useQueryClient();
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
  const timeline = timelineStatusQuery.data?.timeline ?? null;
  const [selectedActionIds, setSelectedActionIds] = useState<string[]>([]);
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
  const decisionCards = useMemo(() => {
    const all = [...(strategy?.quick_wins ?? []), ...(strategy?.medium_term ?? []), ...(strategy?.strategic ?? [])];
    const seen = new Set<string>();
    const out: Array<{
      id: string;
      title: string;
      description: string;
      impact: 'high' | 'medium' | 'low';
      effort: 'low' | 'medium' | 'high';
      why: string | null;
      how: string | null;
      eta: string | null;
      timeframe: string | null;
    }> = [];
    for (const init of all) {
      if (seen.has(init.id)) continue;
      seen.add(init.id);
      out.push({
        id: init.id,
        title: init.title,
        description: init.description,
        impact: init.impact,
        effort: init.effort,
        why: init.decision?.why_this?.[0] ?? null,
        how: init.execution_paths?.[0]?.description ?? null,
        eta: init.execution_paths?.[0]?.time_estimate ?? null,
        timeframe: init.outcome?.timeframe ?? null,
      });
      if (out.length >= 6) break;
    }
    return out;
  }, [strategy]);
  const [selectionRunBusy, setSelectionRunBusy] = useState(false);
  const [selectionRunError, setSelectionRunError] = useState<string | null>(null);
  const [selectionRunSuccess, setSelectionRunSuccess] = useState<string | null>(null);
  const [initiativeMarkPendingId, setInitiativeMarkPendingId] = useState<string | null>(null);
  const [lastMarkedNextStepId, setLastMarkedNextStepId] = useState<string | null>(null);
  const selectedManifestSnapshotId =
    timeline?.version.latest_manifest_snapshot_id ??
    timeline?.version.manifest_snapshot_id ??
    strategy?.glc_orchestration_pack?.manifest_snapshot_id ??
    null;

  async function handleRunSelectedActions(): Promise<void> {
    if (!selectedManifestSnapshotId || selectedActionIds.length === 0) return;
    setSelectionRunBusy(true);
    setSelectionRunError(null);
    setSelectionRunSuccess(null);
    try {
      const result = await api.postOrchestratorRun(auditId, {
        manifest_snapshot_id: selectedManifestSnapshotId,
        selected_action_ids: selectedActionIds,
      });
      setSelectionRunSuccess(
        `${copy.selectionAppliedSuccessPrefix} v${result.roadmap_version}. ${copy.selectionAppliedSuccessSuffix}`,
      );
      await timelineStatusQuery.refetch();
    } catch {
      setSelectionRunError(copy.selectionAppliedError);
    } finally {
      setSelectionRunBusy(false);
    }
  }

  const canMarkSingleNextStep = Boolean(roadmapVersion && selectedManifestSnapshotId);

  async function handleMarkAsNextStep(actionId: string): Promise<void> {
    if (!selectedManifestSnapshotId) {
      toast.error(ORCHESTRATION_UI_COPY.initiativeMarkNextStepUnavailable);
      return;
    }
    setInitiativeMarkPendingId(actionId);
    try {
      await api.postSelectedInitiative(auditId, { action_id: actionId });
      setLastMarkedNextStepId(actionId);
      await timelineStatusQuery.refetch();
      await queryClient.invalidateQueries({ queryKey: glcKeys.audit.detail(auditId) });
      toast.success(ORCHESTRATION_UI_COPY.initiativeMarkNextStepSuccess);
    } catch {
      toast.error(ORCHESTRATION_UI_COPY.initiativeMarkNextStepError);
    } finally {
      setInitiativeMarkPendingId(null);
    }
  }

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

      <div className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-raised)] p-4">
        <h3 className="text-[length:var(--text-xs)] font-semibold text-[var(--text-primary)]">
          {copy.implementationDecisionTitle}
        </h3>
        <p className="mt-2 text-[length:var(--text-xs)] leading-relaxed text-[var(--text-secondary)]">
          {copy.implementationDecisionBody}
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {APP_FEATURE_FLAGS.orchestrationRoadmapUiEnabled &&
          APP_FEATURE_FLAGS.clientRoadmapManifestWizardEnabled &&
          strategy ? (
            <Button asChild variant="default" size="sm" className="no-underline">
              <Link to={manifestWizardHref} className="inline-flex items-center justify-center gap-2">
                <ClipboardText className="h-4 w-4" />
                {copy.implementationDecisionScopeCta}
              </Link>
            </Button>
          ) : null}
          {strategy ? (
            <Button asChild variant="outline" size="sm" className="no-underline">
              <Link to={labHref} className="inline-flex items-center justify-center gap-2">
                <MapTrifold className="h-4 w-4" />
                {copy.implementationDecisionPrioritiesCta}
              </Link>
            </Button>
          ) : null}
          <Button asChild variant="outline" size="sm" className="no-underline">
            <Link to={reportHref} className="inline-flex items-center justify-center gap-2">
              <FileText className="h-4 w-4" />
              {copy.implementationDecisionReportCta}
            </Link>
          </Button>
        </div>
        {!APP_FEATURE_FLAGS.clientRoadmapManifestWizardEnabled && (
          <p className="mt-2 text-[length:var(--text-2xs)] text-[var(--text-tertiary)]">
            {copy.implementationDecisionNoWizardHint}
          </p>
        )}
      </div>
      {decisionCards.length > 0 ? (
        <div className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-raised)] p-4">
          <h3 className="text-[length:var(--text-xs)] font-semibold text-[var(--text-primary)]">{copy.topActionsSelectionTitle}</h3>
          <p className="mt-2 text-[length:var(--text-xs)] leading-relaxed text-[var(--text-secondary)]">{copy.topActionsSelectionBody}</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {decisionCards.map((row) => {
              const selected = selectedActionIds.includes(row.id);
              return (
                <article
                  key={row.id}
                  className="rounded-md border border-[var(--border-default)] bg-[var(--surface-default)] p-3"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                      <h4 className="text-[length:var(--text-xs)] font-semibold text-[var(--text-primary)]">{row.title}</h4>
                      {lastMarkedNextStepId === row.id ? (
                        <span className="rounded-full bg-[var(--status-success-bg)] px-2 py-0.5 text-[10px] font-medium text-[var(--status-success-fg)]">
                          {copy.nextInPlanBadge}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {canMarkSingleNextStep ? (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="inline-flex shrink-0"
                          disabled={initiativeMarkPendingId === row.id}
                          aria-busy={initiativeMarkPendingId === row.id}
                          onClick={() => void handleMarkAsNextStep(row.id)}
                        >
                          {initiativeMarkPendingId === row.id ? (
                            <ArrowsClockwise className="mr-1 h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
                          ) : null}
                          {initiativeMarkPendingId === row.id
                            ? ORCHESTRATION_UI_COPY.initiativeMarkNextStepBusy
                            : ORCHESTRATION_UI_COPY.initiativeMarkNextStepCta}
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        size="sm"
                        variant={selected ? 'default' : 'outline'}
                        onClick={() =>
                          setSelectedActionIds((prev) =>
                            selected ? prev.filter((id) => id !== row.id) : [...prev, row.id],
                          )
                        }
                      >
                        {selected ? copy.topActionsSelectedCta : copy.topActionsSelectCta}
                      </Button>
                    </div>
                  </div>
                  <p className="mt-2 text-[length:var(--text-2xs)] text-[var(--text-secondary)]">{row.description}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${impactTone(row.impact)}`}>
                      {copy.topActionsImpactLabel}: {row.impact}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${effortTone(row.effort)}`}>
                      {copy.topActionsEffortLabel}: {row.effort}
                    </span>
                    {row.eta ? (
                      <span className="rounded-full bg-[var(--surface-muted)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-secondary)]">
                        {copy.topActionsEtaLabel}: {row.eta}
                      </span>
                    ) : null}
                  </div>
                  {row.why ? (
                    <p className="mt-2 text-[length:var(--text-2xs)] text-[var(--text-primary)]">
                      <span className="font-medium">{copy.topActionsWhyLabel}: </span>
                      {row.why}
                    </p>
                  ) : null}
                  {row.how ? (
                    <p className="mt-1 text-[length:var(--text-2xs)] text-[var(--text-secondary)]">
                      <span className="font-medium">{copy.topActionsHowLabel}: </span>
                      {row.how}
                    </p>
                  ) : null}
                  {row.timeframe ? (
                    <p className="mt-1 text-[length:var(--text-2xs)] text-[var(--text-tertiary)]">
                      <span className="font-medium">{copy.topActionsWhenLabel}: </span>
                      {row.timeframe}
                    </p>
                  ) : null}
                </article>
              );
            })}
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button
              type="button"
              variant="default"
              size="sm"
              disabled={selectionRunBusy || selectedActionIds.length === 0 || !selectedManifestSnapshotId}
              onClick={() => void handleRunSelectedActions()}
            >
              {selectionRunBusy ? copy.selectForNextRoadmapBusyCta : copy.selectForNextRoadmapCta}
            </Button>
            <Button asChild variant="outline" size="sm" className="no-underline">
              <Link to={labHref}>{copy.openDetailsInLabCta}</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="no-underline">
              <Link to={adjustScopeHref}>{copy.adjustScopeTitle}</Link>
            </Button>
          </div>
          {!selectedManifestSnapshotId && (
            <p className="mt-2 text-[length:var(--text-2xs)] text-[var(--text-tertiary)]">
              {copy.selectionRequiresManifestHint}
            </p>
          )}
          {selectionRunError && (
            <p className="mt-2 text-[length:var(--text-2xs)] text-[var(--status-error-fg)]">{selectionRunError}</p>
          )}
          {selectionRunSuccess && (
            <p className="mt-2 text-[length:var(--text-2xs)] text-[var(--status-success-fg)]">{selectionRunSuccess}</p>
          )}
          {selectedActionIds.length > 0 ? (
            <p className="mt-2 text-[length:var(--text-2xs)] text-[var(--text-tertiary)]">
              {copy.topActionsSelectionCountLabel}: {selectedActionIds.length}
            </p>
          ) : null}
        </div>
      ) : null}
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
