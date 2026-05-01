import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, Path } from '@phosphor-icons/react';

import { AppShell } from '../components/AppShell';
import { ManifestScenarioCompareCta } from '../components/glc/ManifestScenarioCompareCta';
import { SetAggregatorPanel } from '../components/glc/SetAggregatorPanel';
import { Button } from '../components/ui/button';
import { Input } from '../../design-system/ui';
import { useAudit } from '../hooks/useAudit';
import { api } from '../data/apiService';
import { ApiError } from '../data/api-error';
import { DOMAIN_LABELS, type DomainKey } from '../data/auditTypes';
import type { RoadmapManifestRequestBody } from '../data/api/audits-orchestration';
import { useOrchestrationReadModel } from '../data/api/use-orchestration-read-model';
import { isGlcOrchestrationPackView } from '../lib/orchestration-pack-guards';
import { toast } from 'sonner';
import { useManifestSavedSignatureBaseline } from '../hooks/useManifestSavedSignatureBaseline';
import { useDebouncedOrchestratorManifestPreview } from '../hooks/useDebouncedOrchestratorManifestPreview';
import {
  ORCHESTRATION_CHANGE_SCENARIOS,
  ORCHESTRATION_MANIFEST_SCHEMA_VERSION,
  ORCHESTRATION_SEASON_PRESETS,
  parseOptionalOrchestrationPlanHorizon,
  type OrchestrationChangeScenario,
  type OrchestrationSeasonPreset,
} from '../config/orchestration-roadmap-manifest';
const NO_SELECTED_DOMAINS: DomainKey[] = [];
import {
  ORCHESTRATION_LANE_LABELS,
  ORCHESTRATION_PREVIEW_COMPRESSION_LABELS,
  ORCHESTRATION_PREVIEW_DENSITY_LABELS,
  ORCHESTRATION_SCENARIO_LABELS,
  ORCHESTRATION_SEASON_LABELS,
  ORCHESTRATION_UI_COPY,
} from '../config/orchestration-roadmap-ui-copy.en';
import { PORTAL_MANIFEST_WIZARD_COPY } from '../config/portal-manifest-wizard-copy.en';
import { APP_FEATURE_FLAGS } from '../config/app-feature-flags';
import { buildAppRoute } from '../config/route-paths';
import { CLIENT_AUDIT_VIEW_COPY } from '../config/client-audit-view-copy';
import { formatOrchestrationPackRunErrorMessage } from '../lib/orchestration-pack-api-error';
import { PortalPlanLayout } from './portal-plan/PortalPlanLayout';

export function PortalRoadmapManifestWizardPage() {
  const { id: auditId } = useParams<{ id: string }>();
  const { audit, loading, error, reload } = useAudit(auditId);

  const wizardEnabled =
    APP_FEATURE_FLAGS.clientRoadmapManifestWizardEnabled && APP_FEATURE_FLAGS.orchestrationRoadmapUiEnabled;

  const { packQuery } = useOrchestrationReadModel(auditId, {
    includeTimeline: false,
    enabled: Boolean(auditId) && wizardEnabled,
  });

  const [scenario, setScenario] = useState<OrchestrationChangeScenario>('hybrid');
  const [season, setSeason] = useState<OrchestrationSeasonPreset>('rolling_90d');
  const [planHorizonStart, setPlanHorizonStart] = useState('');
  const [planHorizonEnd, setPlanHorizonEnd] = useState('');
  const [manifestSnapshotId, setManifestSnapshotId] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  const executionPlan = audit?.meta.execution_plan ?? null;
  const selectedDomains = useMemo(
    () => executionPlan?.selected_domains ?? NO_SELECTED_DOMAINS,
    [executionPlan],
  );

  const manifestCompareBody = useMemo((): RoadmapManifestRequestBody | null => {
    if (selectedDomains.length === 0) return null;
    const ph = parseOptionalOrchestrationPlanHorizon(planHorizonStart, planHorizonEnd);
    return {
      schema_version: ORCHESTRATION_MANIFEST_SCHEMA_VERSION,
      selected_domains: selectedDomains,
      change_scenario: scenario,
      season_preset: season,
      ...(ph ? { plan_horizon: ph } : {}),
    };
  }, [selectedDomains, scenario, season, planHorizonStart, planHorizonEnd]);

  const packView = useMemo(() => {
    const p = packQuery.data?.pack;
    return p && isGlcOrchestrationPackView(p) ? p : null;
  }, [packQuery.data?.pack]);

  const domainLabels = useMemo(
    () => [...selectedDomains].sort().map(d => DOMAIN_LABELS[d] ?? d).join(', '),
    [selectedDomains],
  );

  const previewPlanHorizon = parseOptionalOrchestrationPlanHorizon(planHorizonStart, planHorizonEnd);
  const { hasUnsavedManifestChanges, applySignatureFromManifestPayload, markDraftAsSavedBaseline, clearSavedSignature } =
    useManifestSavedSignatureBaseline({
    scenario,
    season,
    planHorizonStart,
    planHorizonEnd,
  });

  useEffect(() => {
    if (!auditId || !wizardEnabled) return;
    let cancelled = false;
    void (async () => {
      try {
        const latest = await api.getRoadmapManifestSnapshotLatest(auditId);
        const row = latest.snapshot;
        if (cancelled || !row) return;
        setManifestSnapshotId(row.id);
        setScenario(row.payload.change_scenario);
        setSeason(row.payload.season_preset);
        setPlanHorizonStart(row.payload.plan_horizon?.start_date ?? '');
        setPlanHorizonEnd(row.payload.plan_horizon?.end_date ?? '');
        applySignatureFromManifestPayload(row.payload);
      } catch {
        if (!cancelled) {
          setManifestSnapshotId(null);
          clearSavedSignature();
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [auditId, wizardEnabled, applySignatureFromManifestPayload, clearSavedSignature]);

  const { manifestPreview, manifestPreviewError, previewLoading } = useDebouncedOrchestratorManifestPreview({
    auditId,
    body: manifestCompareBody,
    enabled: wizardEnabled && Boolean(auditId) && selectedDomains.length > 0 && manifestCompareBody != null,
  });

  const handleSaveManifest = useCallback(async () => {
    if (!auditId || selectedDomains.length === 0) return;
    setWorking(true);
    try {
      const planHorizon = parseOptionalOrchestrationPlanHorizon(planHorizonStart, planHorizonEnd);
      const res = await api.postRoadmapManifestSnapshot(auditId, {
        schema_version: ORCHESTRATION_MANIFEST_SCHEMA_VERSION,
        selected_domains: selectedDomains,
        change_scenario: scenario,
        season_preset: season,
        ...(planHorizon ? { plan_horizon: planHorizon } : {}),
      });
      setManifestSnapshotId(res.id);
      markDraftAsSavedBaseline();
      toast.success(ORCHESTRATION_UI_COPY.manifestSaved);
    } catch (e) {
      const detail =
        e instanceof ApiError && e.details && typeof e.details === 'object' && e.details !== null && 'detail' in e.details
          ? String((e.details as { detail?: unknown }).detail ?? '')
          : '';
      toast.error(detail ? `${ORCHESTRATION_UI_COPY.manifestSaveFailed} (${detail})` : ORCHESTRATION_UI_COPY.manifestSaveFailed);
    } finally {
      setWorking(false);
    }
  }, [
    auditId,
    selectedDomains,
    scenario,
    season,
    planHorizonStart,
    planHorizonEnd,
    markDraftAsSavedBaseline,
  ]);

  const handleBuildPack = useCallback(async () => {
    if (!auditId || !manifestSnapshotId) return;
    setWorking(true);
    try {
      await api.postOrchestratorRun(auditId, { manifest_snapshot_id: manifestSnapshotId });
      toast.success(`${ORCHESTRATION_UI_COPY.packBuilt} ${PORTAL_MANIFEST_WIZARD_COPY.successPackBuilt}`);
      reload();
    } catch (e) {
      const { message, description } = formatOrchestrationPackRunErrorMessage(e, ORCHESTRATION_UI_COPY.packBuildFailed);
      toast.error(message, description ? { description, duration: 14_000 } : { duration: 6_000 });
    } finally {
      setWorking(false);
    }
  }, [auditId, manifestSnapshotId, reload]);

  if (!wizardEnabled) {
    return (
      <AppShell title={PORTAL_MANIFEST_WIZARD_COPY.pageTitle} subtitle={PORTAL_MANIFEST_WIZARD_COPY.featureDisabled}>
        <div className="glc-page-content mx-auto max-w-2xl space-y-4 p-4">
          <p className="text-sm ds-text-secondary">{PORTAL_MANIFEST_WIZARD_COPY.featureDisabled}</p>
          {auditId ? (
            <Button asChild variant="outline" className="no-underline">
              <Link to={buildAppRoute.portalAudit(auditId)}>{PORTAL_MANIFEST_WIZARD_COPY.backToAuditOverview}</Link>
            </Button>
          ) : null}
        </div>
      </AppShell>
    );
  }

  if (!auditId) {
    return (
      <AppShell title={PORTAL_MANIFEST_WIZARD_COPY.pageTitle} subtitle={CLIENT_AUDIT_VIEW_COPY.page.missingId}>
        <div className="glc-page-content mx-auto max-w-2xl p-4 text-sm ds-text-secondary">
          {CLIENT_AUDIT_VIEW_COPY.page.missingId}
        </div>
      </AppShell>
    );
  }

  if (loading && !audit) {
    return (
      <AppShell title={PORTAL_MANIFEST_WIZARD_COPY.pageTitle} subtitle={ORCHESTRATION_UI_COPY.previewLoading}>
        <div className="flex h-64 items-center justify-center">
          <p className="text-sm ds-text-secondary">{ORCHESTRATION_UI_COPY.previewLoading}</p>
        </div>
      </AppShell>
    );
  }

  if (error || !audit) {
    return (
      <AppShell title={PORTAL_MANIFEST_WIZARD_COPY.pageTitle} subtitle={CLIENT_AUDIT_VIEW_COPY.cockpit.subtitle}>
        <div className="glc-page-content mx-auto max-w-2xl p-4 text-sm ds-text-secondary">
          {error ?? CLIENT_AUDIT_VIEW_COPY.page.missingId}
        </div>
      </AppShell>
    );
  }

  if (!audit.strategy) {
    return (
      <AppShell title={PORTAL_MANIFEST_WIZARD_COPY.pageTitle} subtitle={PORTAL_MANIFEST_WIZARD_COPY.strategyMissing}>
        <PortalPlanLayout
          auditId={auditId}
          isClient
          audit={audit}
          planChromeMode="manifest-wizard"
        >
          <div className="glc-page-content mx-auto max-w-2xl space-y-4 p-4">
            <p className="text-sm ds-text-secondary">{PORTAL_MANIFEST_WIZARD_COPY.strategyMissing}</p>
            <Button asChild variant="outline" className="no-underline">
              <Link to={buildAppRoute.portalAudit(auditId)}>{PORTAL_MANIFEST_WIZARD_COPY.backToAuditOverview}</Link>
            </Button>
          </div>
        </PortalPlanLayout>
      </AppShell>
    );
  }

  if (!executionPlan || selectedDomains.length === 0) {
    return (
      <AppShell title={PORTAL_MANIFEST_WIZARD_COPY.pageTitle} subtitle={PORTAL_MANIFEST_WIZARD_COPY.executionPlanMissing}>
        <PortalPlanLayout
          auditId={auditId}
          isClient
          audit={audit}
          planChromeMode="manifest-wizard"
        >
          <div className="glc-page-content mx-auto max-w-2xl space-y-4 p-4">
            <p className="text-sm ds-text-secondary">{PORTAL_MANIFEST_WIZARD_COPY.executionPlanMissing}</p>
            <Button asChild variant="outline" className="no-underline">
              <Link to={buildAppRoute.portalAudit(auditId)}>{PORTAL_MANIFEST_WIZARD_COPY.backToAuditOverview}</Link>
            </Button>
          </div>
        </PortalPlanLayout>
      </AppShell>
    );
  }

  const auditOverviewHref = buildAppRoute.portalAudit(auditId);
  const timelineHref = buildAppRoute.portalPlan(auditId, 'timeline');
  const labHref = buildAppRoute.portalStrategy(auditId);

  return (
    <AppShell title={PORTAL_MANIFEST_WIZARD_COPY.pageTitle} subtitle={PORTAL_MANIFEST_WIZARD_COPY.pageSubtitle}>
      <PortalPlanLayout
        auditId={auditId}
        isClient
        audit={audit}
        planChromeMode="manifest-wizard"
      >
      <div className="glc-page-content mx-auto max-w-2xl space-y-5 ds-pattern-page-shell-body">
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm" className="no-underline">
            <Link to={auditOverviewHref} className="inline-flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              {PORTAL_MANIFEST_WIZARD_COPY.backToAuditOverview}
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="no-underline">
            <Link to={timelineHref} className="inline-flex items-center gap-2">
              <Path className="h-4 w-4" />
              {PORTAL_MANIFEST_WIZARD_COPY.backToTimeline}
            </Link>
          </Button>
        </div>

        <p className="text-sm leading-relaxed ds-text-secondary">
          {PORTAL_MANIFEST_WIZARD_COPY.introBody}
        </p>

        <section className="glc-soft-panel space-y-3 p-4" aria-labelledby="portal-manifest-wizard-coverage">
          <h2 id="portal-manifest-wizard-coverage" className="text-sm font-semibold ds-text-primary">
            {PORTAL_MANIFEST_WIZARD_COPY.stepCoverageTitle}
          </h2>
          <p className="text-xs ds-text-secondary">{PORTAL_MANIFEST_WIZARD_COPY.stepCoverageBody}</p>
          <p className="text-sm ds-text-primary">{domainLabels}</p>
        </section>

        <section className="glc-soft-panel space-y-3 p-4" aria-labelledby="portal-manifest-wizard-prefs">
          <h2 id="portal-manifest-wizard-prefs" className="text-sm font-semibold ds-text-primary">
            {PORTAL_MANIFEST_WIZARD_COPY.stepPreferencesTitle}
          </h2>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium ds-text-secondary">
              {ORCHESTRATION_UI_COPY.scenarioLabel}
            </span>
            <select
              className="border-border bg-background text-foreground h-9 rounded-md border px-2 text-xs"
              value={scenario}
              onChange={e => setScenario(e.target.value as OrchestrationChangeScenario)}
            >
              {ORCHESTRATION_CHANGE_SCENARIOS.map(s => (
                <option key={s} value={s}>
                  {ORCHESTRATION_SCENARIO_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium ds-text-secondary">
              {ORCHESTRATION_UI_COPY.seasonLabel}
            </span>
            <select
              className="border-border bg-background text-foreground h-9 rounded-md border px-2 text-xs"
              value={season}
              onChange={e => setSeason(e.target.value as OrchestrationSeasonPreset)}
            >
              {ORCHESTRATION_SEASON_PRESETS.map(s => (
                <option key={s} value={s}>
                  {ORCHESTRATION_SEASON_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
          <div className="space-y-2">
            <span className="text-xs font-medium ds-text-secondary">
              {ORCHESTRATION_UI_COPY.planHorizonLabel}
            </span>
            <p className="text-[length:var(--text-2xs)] leading-relaxed ds-text-tertiary">
              {ORCHESTRATION_UI_COPY.planHorizonHint}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="flex flex-1 flex-col gap-1">
                <span className="text-[length:var(--text-2xs)] ds-text-tertiary">
                  {ORCHESTRATION_UI_COPY.planHorizonStartLabel}
                </span>
                <Input
                  type="date"
                  className="border-border bg-background text-foreground h-9 rounded-md border px-2 text-xs"
                  value={planHorizonStart}
                  onChange={e => setPlanHorizonStart(e.target.value)}
                />
              </label>
              <label className="flex flex-1 flex-col gap-1">
                <span className="text-[length:var(--text-2xs)] ds-text-tertiary">
                  {ORCHESTRATION_UI_COPY.planHorizonEndLabel}
                </span>
                <Input
                  type="date"
                  className="border-border bg-background text-foreground h-9 rounded-md border px-2 text-xs"
                  value={planHorizonEnd}
                  onChange={e => setPlanHorizonEnd(e.target.value)}
                />
              </label>
            </div>
          </div>
        </section>

        <section className="glc-soft-panel space-y-3 p-4" aria-labelledby="portal-manifest-wizard-preview">
          <h2 id="portal-manifest-wizard-preview" className="text-sm font-semibold ds-text-primary">
            {PORTAL_MANIFEST_WIZARD_COPY.stepPreviewTitle}
          </h2>
          {previewLoading ? (
            <p className="text-xs ds-text-secondary">{ORCHESTRATION_UI_COPY.previewLoading}</p>
          ) : null}
          {manifestPreviewError ? <p className="text-xs ds-text-score-1">{manifestPreviewError}</p> : null}
          <ul className="space-y-1 text-xs ds-text-primary">
            <li>
              <span className="ds-text-secondary">{ORCHESTRATION_UI_COPY.previewDomains}: </span>
              {domainLabels}
            </li>
            <li>
              <span className="ds-text-secondary">{ORCHESTRATION_UI_COPY.previewScenario}: </span>
              {ORCHESTRATION_SCENARIO_LABELS[scenario]}
            </li>
            <li>
              <span className="ds-text-secondary">{ORCHESTRATION_UI_COPY.previewSeason}: </span>
              {ORCHESTRATION_SEASON_LABELS[season]}
            </li>
            {previewPlanHorizon ? (
              <li>
                <span className="ds-text-secondary">{ORCHESTRATION_UI_COPY.planHorizonLabel}: </span>
                {previewPlanHorizon.start_date} – {previewPlanHorizon.end_date}
              </li>
            ) : null}
            {manifestPreview ? (
              <>
                <li>
                  <span className="ds-text-secondary">{ORCHESTRATION_UI_COPY.previewCompression}: </span>
                  {ORCHESTRATION_PREVIEW_COMPRESSION_LABELS[manifestPreview.execution_compression_hint]}
                </li>
                <li>
                  <span className="ds-text-secondary">{ORCHESTRATION_UI_COPY.previewDensity}: </span>
                  {ORCHESTRATION_PREVIEW_DENSITY_LABELS[manifestPreview.lane_density_band]}
                </li>
              </>
            ) : null}
          </ul>
          {manifestPreview ? (
            <div className="border-border space-y-2 border-t pt-2">
              <div>
                <div className="mb-1 text-xs font-medium ds-text-secondary">
                  {ORCHESTRATION_UI_COPY.previewLanesIncluded}
                </div>
                <ul className="list-inside list-disc text-xs ds-text-primary">
                  {manifestPreview.lanes_included.map(lane => (
                    <li key={lane}>{ORCHESTRATION_LANE_LABELS[lane]}</li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="mb-1 text-xs font-medium ds-text-secondary">
                  {ORCHESTRATION_UI_COPY.previewLanesCut}
                </div>
                <ul className="list-inside list-disc text-xs ds-text-primary">
                  {manifestPreview.lanes_cut.length === 0 && <li>{ORCHESTRATION_UI_COPY.timelineEmptyListMarker}</li>}
                  {manifestPreview.lanes_cut.map(lane => (
                    <li key={lane}>{ORCHESTRATION_LANE_LABELS[lane]}</li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="mb-1 text-xs font-medium ds-text-secondary">
                  {ORCHESTRATION_UI_COPY.previewWaitingList}
                </div>
                <ul className="list-inside list-disc text-xs ds-text-primary">
                  {manifestPreview.waiting_list_domains.length === 0 && (
                    <li>{ORCHESTRATION_UI_COPY.timelineEmptyListMarker}</li>
                  )}
                  {manifestPreview.waiting_list_domains.map(d => (
                    <li key={d}>{DOMAIN_LABELS[d] ?? d}</li>
                  ))}
                </ul>
              </div>
              {manifestPreview.confidence_callouts.length > 0 ? (
                <ul className="list-inside list-disc text-[length:var(--text-2xs)] ds-text-tertiary">
                  {manifestPreview.confidence_callouts.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </section>

        {(APP_FEATURE_FLAGS.orchestrationSetAggregatorEnabled && packView) ||
        (APP_FEATURE_FLAGS.manifestScenarioCompareEnabled && manifestCompareBody) ? (
          <section className="glc-soft-panel space-y-3 p-4" aria-labelledby="portal-manifest-wizard-extras">
            <h2 id="portal-manifest-wizard-extras" className="text-sm font-semibold ds-text-primary">
              {PORTAL_MANIFEST_WIZARD_COPY.stepPreviewExtrasTitle}
            </h2>
            <p className="text-xs ds-text-secondary">
              {PORTAL_MANIFEST_WIZARD_COPY.stepPreviewExtrasBody}
            </p>
            <div className="flex flex-wrap gap-2">
              {APP_FEATURE_FLAGS.manifestScenarioCompareEnabled && manifestCompareBody ? (
                <ManifestScenarioCompareCta auditId={auditId} basePayload={manifestCompareBody} />
              ) : null}
            </div>
            {APP_FEATURE_FLAGS.orchestrationSetAggregatorEnabled && packView ? <SetAggregatorPanel pack={packView} /> : null}
          </section>
        ) : null}

        <section className="glc-soft-panel space-y-3 p-4" aria-labelledby="portal-manifest-wizard-publish">
          <h2 id="portal-manifest-wizard-publish" className="text-sm font-semibold ds-text-primary">
            {PORTAL_MANIFEST_WIZARD_COPY.stepPublishTitle}
          </h2>
          <p className="text-xs ds-text-secondary">{PORTAL_MANIFEST_WIZARD_COPY.stepPublishBody}</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" disabled={working} onClick={() => void handleSaveManifest()}>
              {ORCHESTRATION_UI_COPY.confirmSaveManifest}
            </Button>
            <Button
              type="button"
              variant="default"
              disabled={working || !manifestSnapshotId || hasUnsavedManifestChanges}
              onClick={() => void handleBuildPack()}
            >
              {ORCHESTRATION_UI_COPY.buildPack}
            </Button>
          </div>
          {hasUnsavedManifestChanges ? (
            <p className="text-xs ds-text-tertiary">{ORCHESTRATION_UI_COPY.buildPackNeedsManifestSync}</p>
          ) : null}
          <Button asChild variant="outline" size="sm" className="no-underline">
            <Link to={labHref}>{PORTAL_MANIFEST_WIZARD_COPY.openStrategyLab}</Link>
          </Button>
        </section>
      </div>
      </PortalPlanLayout>
    </AppShell>
  );
}
