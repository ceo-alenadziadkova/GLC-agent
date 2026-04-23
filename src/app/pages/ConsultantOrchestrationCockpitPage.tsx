import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, Link, Navigate } from 'react-router';
import { useState } from 'react';
import { toast } from 'sonner';
import { AppShell } from '../components/AppShell';
import { Button } from '../components/ui/button';
import { APP_FEATURE_FLAGS } from '../config/app-feature-flags';
import { ORCHESTRATION_UI_COPY } from '../config/orchestration-roadmap-ui-copy.en';
import { buildAppRoute } from '../config/route-paths';
import { api } from '../data/apiService';
import { useOrchestrationReadModel } from '../data/api/use-orchestration-read-model';
import { glcKeys } from '../lib/glc-keys';
import { isGlcOrchestrationPackView } from '../lib/orchestration-pack-guards';
import { orchestrationNodeTitleMap } from '../lib/orchestration-timeline-projection';

export function ConsultantOrchestrationCockpitPage() {
  const { id: auditId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { packQuery, isLoading, isError } = useOrchestrationReadModel(auditId, { includeTimeline: false });
  const [rebuildPending, setRebuildPending] = useState(false);

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
    try {
      await api.postOrchestrationPack(auditId, { manifest_snapshot_id: manifestSnapshotId });
      await queryClient.invalidateQueries({ queryKey: glcKeys.orchestrationPack.detail(auditId) });
      await queryClient.invalidateQueries({ queryKey: glcKeys.audit.detail(auditId) });
      await queryClient.invalidateQueries({ queryKey: glcKeys.timeline.detail(auditId) });
      toast.success(ORCHESTRATION_UI_COPY.consultantCockpitRegeneratePackSuccess);
    } catch {
      toast.error(ORCHESTRATION_UI_COPY.consultantCockpitRegeneratePackError);
    } finally {
      setRebuildPending(false);
    }
  };

  return (
    <AppShell
      title="Orchestration cockpit"
      subtitle="Read-only pack, governance, and critical path (same API as the client portal)."
    >
      {isLoading ? (
        <p className="text-sm ds-text-tertiary">Loading…</p>
      ) : isError ? (
        <p className="text-sm ds-text-secondary">Could not load orchestration data.</p>
      ) : !view ? (
        <p className="text-sm ds-text-secondary">No pack persisted for this audit yet.</p>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="sm" className="no-underline">
              <Link to={buildAppRoute.strategy(auditId)}>{ORCHESTRATION_UI_COPY.consultantCockpitRefineCta}</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="no-underline">
              <Link to={buildAppRoute.timeline(auditId)}>Timeline</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="no-underline">
              <Link to={buildAppRoute.portalRoadmapManifest(auditId)}>Manifest wizard</Link>
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
          </div>
          <p className="text-xs ds-text-tertiary">{ORCHESTRATION_UI_COPY.consultantCockpitGovernanceHint}</p>
          {governance ? (
            <div className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-raised)] p-4">
              <h2 className="text-sm font-semibold ds-text-primary">{ORCHESTRATION_UI_COPY.governanceTitle}</h2>
              <dl className="mt-2 grid gap-2 text-sm ds-text-secondary sm:grid-cols-2">
                <div>
                  <dt className="text-xs uppercase ds-text-tertiary">
                    {ORCHESTRATION_UI_COPY.governanceDecisionHintLabel}
                  </dt>
                  <dd className="font-mono text-sm ds-text-primary">{governance.decision_hint}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase ds-text-tertiary">status</dt>
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
                    <p className="text-sm ds-text-secondary">
                      Plan gate suggests refinement — use Manifest wizard or Strategy Lab, then rebuild.
                    </p>
                  </div>
                ) : null}
              </dl>
            </div>
          ) : null}
          <div className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-raised)] p-4">
            <h2 className="text-sm font-semibold ds-text-primary">Critical path</h2>
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
          <div className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-raised)] p-4">
            <h2 className="text-sm font-semibold ds-text-primary">Initiatives</h2>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[32rem] text-left text-sm">
                <thead className="text-xs uppercase ds-text-tertiary">
                  <tr>
                    <th className="py-1 pr-3">Title</th>
                    <th className="py-1 pr-3">Lane</th>
                    <th className="py-1 pr-3">Domain</th>
                  </tr>
                </thead>
                <tbody className="ds-text-secondary">
                  {view.graph.nodes.map((n) => (
                    <tr key={n.id} className="border-t border-[var(--border-default)]">
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
