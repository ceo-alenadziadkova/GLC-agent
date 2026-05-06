import { useQuery, useQueryClient } from '../lib/tanstack-react-query';
import { useParams, Link, Navigate } from 'react-router';
import { useState } from 'react';
import { toast } from 'sonner';
import { AppShell } from '../components/AppShell';
import { SetAggregatorPanel } from '../components/glc/SetAggregatorPanel';
import { PlanControlObjectPanel } from '../components/glc/PlanControlObjectPanel';
import { ManifestScenarioCompareCta } from '../components/glc/ManifestScenarioCompareCta';
import { Button } from '../components/ui/button';
import { APP_FEATURE_FLAGS } from '../config/app-feature-flags';
import { ORCHESTRATION_UI_COPY } from '../config/orchestration-roadmap-ui-copy.en';
import { buildAppRoute } from '../config/route-paths';
import { buildPlanWorkspaceHref } from '../lib/plan-cross-nav';
import { primaryPlanWorkbenchViewForStrategyLinks } from '../config/plan-delivery-board-ui';
import { api } from '../data/apiService';
import { useOrchestrationReadModel } from '../data/api/use-orchestration-read-model';
import { useAudit } from '../hooks/useAudit';
import { useStrategyJourneyStepStatuses } from '../hooks/useStrategyJourneyStepStatuses';
import { glcKeys } from '../lib/glc-keys';
import { invalidatePlanWorkspaceQueries } from '../lib/plan-workspace-queries';
import { isGlcOrchestrationPackView } from '../lib/orchestration-pack-guards';
import { orchestrationNodeTitleMap } from '../lib/orchestration-timeline-projection';
import { ApiError } from '../data/api-error';
import { StrategyPlanningChrome } from './strategy-lab/StrategyPlanningChrome';

export function ConsultantOrchestrationCockpitPage() {
  const { id: auditId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { audit } = useAudit(auditId);
  const journeySteps = useStrategyJourneyStepStatuses(audit);
  const { packQuery, isLoading, isError } = useOrchestrationReadModel(auditId, { includeTimeline: false });
  const [rebuildPending, setRebuildPending] = useState(false);
  const [governPending, setGovernPending] = useState(false);
  const [stalePack, setStalePack] = useState(false);

  const latestManifestQuery = useQuery({
    queryKey: ['glc', 'roadmap-manifest-snapshot', 'latest', auditId ?? ''] as const,
    queryFn: () => api.getRoadmapManifestSnapshotLatest(auditId as string),
    enabled: Boolean(auditId) && APP_FEATURE_FLAGS.consultantOrchestrationCockpitEnabled,
  });

  if (!APP_FEATURE_FLAGS.consultantOrchestrationCockpitEnabled) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!auditId) {
    return <Navigate to="/dashboard" replace />;
  }

  const pack = packQuery.data?.pack;
  const governance = packQuery.data?.plan_governance;
  const view = isGlcOrchestrationPackView(pack) ? pack : null;
  const titles = view ? orchestrationNodeTitleMap(view) : new Map<string, string>();
  const manifestSnapshotId = latestManifestQuery.data?.snapshot?.id ?? null;
  const decisionHint = governance?.decision_hint;

  const onRebuild = async () => {
    if (!manifestSnapshotId) {
      toast.error(ORCHESTRATION_UI_COPY.consultantCockpitNoManifest);
      return;
    }
    setRebuildPending(true);
    setStalePack(false);
    try {
      await api.postOrchestrationPack(auditId, { manifest_snapshot_id: manifestSnapshotId });
      await invalidatePlanWorkspaceQueries(queryClient, auditId);
      await queryClient.invalidateQueries({ queryKey: glcKeys.timeline.detail(auditId) });
      toast.success(ORCHESTRATION_UI_COPY.consultantCockpitRegeneratePackSuccess);
    } catch {
      toast.error(ORCHESTRATION_UI_COPY.consultantCockpitRegeneratePackError);
    } finally {
      setRebuildPending(false);
    }
  };

  const onGovern = async (govern_action: 'accept_plan' | 'accept_with_warnings' | 'refine_plan') => {
    const v = packQuery.data?.orchestration_pack_version;
    if (v == null || v <= 0) {
      toast.error(ORCHESTRATION_UI_COPY.consultantCockpitRegeneratePackError);
      return;
    }
    setGovernPending(true);
    setStalePack(false);
    try {
      await api.postOrchestrationPack(auditId, { govern_action, expected_orchestration_pack_version: v });
      await invalidatePlanWorkspaceQueries(queryClient, auditId);
      toast.success(ORCHESTRATION_UI_COPY.consultantCockpitGovernanceRecordedToast);
    } catch (e) {
      if (e instanceof ApiError && e.code === 'AUDITS_ORCHESTRATION_PACK_STALE_VERSION') {
        setStalePack(true);
        toast.error(ORCHESTRATION_UI_COPY.consultantCockpitStaleBanner);
        await invalidatePlanWorkspaceQueries(queryClient, auditId);
      } else {
        toast.error(ORCHESTRATION_UI_COPY.consultantCockpitRegeneratePackError);
      }
    } finally {
      setGovernPending(false);
    }
  };

  return (
    <AppShell
      title={ORCHESTRATION_UI_COPY.consultantCockpitAppShellTitle}
      subtitle={ORCHESTRATION_UI_COPY.consultantCockpitAppShellSubtitle}
    >
      {APP_FEATURE_FLAGS.orchestrationRoadmapUiEnabled && auditId ? (
        <StrategyPlanningChrome
          auditId={auditId}
          isClient={false}
          audit={audit}
          variant={{ kind: 'strategy-lab' }}
          steps={journeySteps}
          workbenchOrchestrationHref={buildAppRoute.auditOrchestration(auditId)}
        />
      ) : null}
      {isLoading ? (
        <p className="text-sm ds-text-tertiary">{ORCHESTRATION_UI_COPY.consultantCockpitLoadingLabel}</p>
      ) : isError ? (
        <p className="text-sm ds-text-secondary">{ORCHESTRATION_UI_COPY.consultantCockpitLoadError}</p>
      ) : !view ? (
        <p className="text-sm ds-text-secondary">{ORCHESTRATION_UI_COPY.consultantCockpitNoPackBody}</p>
      ) : (
        <div className="space-y-6">
          {stalePack ? (
            <p
              className="border-border bg-card rounded-md border px-3 py-2 text-sm ds-text-secondary"
              data-testid="orchestration-stale-pack-banner"
            >
              {ORCHESTRATION_UI_COPY.consultantCockpitStaleBanner}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="sm" className="no-underline">
              <Link to={buildPlanWorkspaceHref({ auditId, isClient: false, mode: 'shape' })}>
                {ORCHESTRATION_UI_COPY.consultantCockpitRefineCta}
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="no-underline">
              <Link
                to={buildPlanWorkspaceHref({
                  auditId,
                  isClient: false,
                  mode: 'execute',
                  view: primaryPlanWorkbenchViewForStrategyLinks(),
                })}
              >
                {ORCHESTRATION_UI_COPY.consultantCockpitPlanLinkLabel}
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="no-underline">
              <Link to={buildAppRoute.portalRoadmapManifest(auditId)}>
                {ORCHESTRATION_UI_COPY.consultantCockpitManifestWizardLinkLabel}
              </Link>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={rebuildPending || latestManifestQuery.isLoading || !manifestSnapshotId}
              onClick={() => void onRebuild()}
            >
              {rebuildPending
                ? ORCHESTRATION_UI_COPY.consultantCockpitRegeneratePackBusy
                : ORCHESTRATION_UI_COPY.consultantCockpitRegeneratePackCta}
            </Button>
            {APP_FEATURE_FLAGS.manifestScenarioCompareEnabled && latestManifestQuery.data?.snapshot?.payload ? (
              <ManifestScenarioCompareCta auditId={auditId} basePayload={latestManifestQuery.data.snapshot.payload} />
            ) : null}
          </div>
          {APP_FEATURE_FLAGS.consultantGovernanceCtasEnabled ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="default"
                disabled={governPending || !packQuery.data?.orchestration_pack_version}
                onClick={() => void onGovern('accept_plan')}
              >
                {ORCHESTRATION_UI_COPY.consultantCockpitAcceptPlan}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={governPending || !packQuery.data?.orchestration_pack_version}
                onClick={() => void onGovern('accept_with_warnings')}
              >
                {ORCHESTRATION_UI_COPY.consultantCockpitAcceptWithWarnings}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={governPending}
                onClick={() => void onGovern('refine_plan')}
              >
                {ORCHESTRATION_UI_COPY.consultantCockpitRefinePlan}
              </Button>
            </div>
          ) : (
            <p className="text-xs ds-text-tertiary">{ORCHESTRATION_UI_COPY.consultantCockpitGovernanceDisabled}</p>
          )}
          <p className="text-xs ds-text-tertiary">{ORCHESTRATION_UI_COPY.consultantCockpitGovernanceHint}</p>
          {governance ? (
            <div className="border-border bg-card rounded-lg border p-4">
              <h2 className="text-sm font-semibold ds-text-primary">{ORCHESTRATION_UI_COPY.governanceTitle}</h2>
              <dl className="mt-2 grid gap-2 text-sm ds-text-secondary sm:grid-cols-2">
                <div>
                  <dt className="text-xs uppercase ds-text-tertiary">
                    {ORCHESTRATION_UI_COPY.governanceDecisionHintLabel}
                  </dt>
                  <dd className="font-mono text-sm ds-text-primary">{governance.decision_hint}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase ds-text-tertiary">
                    {ORCHESTRATION_UI_COPY.consultantCockpitGovernanceStatusLabel}
                  </dt>
                  <dd className="ds-text-primary">{governance.status}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase ds-text-tertiary">integrity_score</dt>
                  <dd>{governance.integrity_score?.toFixed?.(2) ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase ds-text-tertiary">Pack version</dt>
                  <dd>{packQuery.data?.orchestration_pack_version ?? '—'}</dd>
                </div>
                {decisionHint === 'refine_plan' ? (
                  <div className="sm:col-span-2">
                    <p className="text-sm ds-text-secondary">{ORCHESTRATION_UI_COPY.consultantCockpitGovernanceRefineBanner}</p>
                  </div>
                ) : null}
              </dl>
            </div>
          ) : null}
          {APP_FEATURE_FLAGS.orchestrationSetAggregatorEnabled ? <SetAggregatorPanel pack={view} /> : null}
          {APP_FEATURE_FLAGS.planControlObjectUiEnabled ? <PlanControlObjectPanel pack={view} /> : null}
          <div className="border-border bg-card rounded-lg border p-4">
            <h2 className="text-sm font-semibold ds-text-primary">{ORCHESTRATION_UI_COPY.consultantCockpitCriticalPathHeading}</h2>
            <ol className="mt-2 list-inside list-decimal space-y-1 text-sm ds-text-secondary">
              {view.critical_path.length === 0 ? (
                <li>{ORCHESTRATION_UI_COPY.timelineEmptyListMarker}</li>
              ) : (
                view.critical_path.map((nid) => (
                  <li key={nid}>{titles.get(nid) ?? nid}</li>
                ))
              )}
            </ol>
          </div>
          <div className="border-border bg-card rounded-lg border p-4">
            <h2 className="text-sm font-semibold ds-text-primary">{ORCHESTRATION_UI_COPY.consultantCockpitInitiativesHeading}</h2>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[length:var(--consultant-orchestration-initiatives-table-min-width)] text-left text-sm">
                <thead className="text-xs uppercase ds-text-tertiary">
                  <tr>
                    <th className="py-1 pr-3">{ORCHESTRATION_UI_COPY.consultantCockpitTableColTitle}</th>
                    <th className="py-1 pr-3">{ORCHESTRATION_UI_COPY.consultantCockpitTableColLane}</th>
                    <th className="py-1 pr-3">{ORCHESTRATION_UI_COPY.consultantCockpitTableColDomain}</th>
                  </tr>
                </thead>
                <tbody className="ds-text-secondary">
                  {view.graph.nodes.map((n) => (
                    <tr key={n.id} className="border-border border-t">
                      <td className="py-2 pr-3 align-top font-medium ds-text-primary">{n.title}</td>
                      <td className="py-2 pr-3 align-top">{n.lane}</td>
                      <td className="py-2 pr-3 align-top">{n.domain}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
