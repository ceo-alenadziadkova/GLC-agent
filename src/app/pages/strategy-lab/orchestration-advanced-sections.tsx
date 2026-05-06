import type { DomainKey } from '@glc/intake-core';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';

import type { AuditMeta } from '../../data/audit/contracts/core/audit-meta.types';
import type { GlcOrchestrationPackView } from '../../data/audit/contracts/report/orchestration-pack.types';
import type {
  GlcOrchestrationPackRevisionDiffView,
  OrchestrationCommercialOfferResponseDto,
  OrchestrationPackRevisionHistoryItemDto,
  OrchestrationPlanGovernanceDto,
  RoadmapManifestSnapshotListItem,
} from '../../data/api/audits-orchestration';
import type {
  StrategyRoadmap,
} from '../../data/audit/contracts/report/report-domain.types';
import type { OrchestrationChangeScenario, OrchestrationSeasonPreset } from '../../config/orchestration-roadmap-manifest';
import { DOMAIN_LABELS } from '../../data/auditTypes';
import { Button } from '../../components/ui/button';
import { APP_FEATURE_FLAGS } from '../../config/app-feature-flags';
import {
  ORCHESTRATION_LANE_LABELS,
  ORCHESTRATION_SCENARIO_LABELS,
  ORCHESTRATION_SEASON_LABELS,
  ORCHESTRATION_UI_COPY,
  type OrchestrationLaneId,
} from '../../config/orchestration-roadmap-ui-copy.en';
import { STRATEGY_LAB_COPY } from '../../config/strategy-lab-copy';
import { formatAppMediumDateTime } from '../../lib/date-format';
import { OrchestrationPanelDiagnosticsSection } from './orchestration-panel/OrchestrationPanelDiagnosticsSection';
import { TimelineLinkButton } from './TimelineLinkButton';

type ExecutionPlan = NonNullable<AuditMeta['execution_plan']>;

export type OrchestrationAdvancedRevisionCandidate = {
  key: string;
  from_version: number;
  to_version: number;
  diff: GlcOrchestrationPackRevisionDiffView | null;
};

export type OrchestrationAdvancedSectionsProps = {
  auditId: string;
  executionPlan: ExecutionPlan;
  strategy: StrategyRoadmap;
  pack: GlcOrchestrationPackView | null;
  planGovernance: OrchestrationPlanGovernanceDto | null;
  governanceHints: ReadonlyArray<string>;
  revisionHistory: OrchestrationPackRevisionHistoryItemDto[];
  roadmapVersionToShow: number;
  revisionDiffCandidates: ReadonlyArray<OrchestrationAdvancedRevisionCandidate>;
  selectedRevisionDiff: GlcOrchestrationPackRevisionDiffView | null;
  selectedRevisionDiffKey: string | null;
  setSelectedRevisionDiffKey: Dispatch<SetStateAction<string | null>>;
  titleById: Map<string, string>;
  analysisDepthFilter: 'all' | 'baseline' | 'deep';
  setAnalysisDepthFilter: Dispatch<SetStateAction<'all' | 'baseline' | 'deep'>>;
  depthFilteredNodes: ReadonlyArray<{
    id: string;
    title: string;
    analysis_depth: 'baseline' | 'deep';
  }>;
  synthesisConflicts: ReadonlyArray<{
    id: string;
    resolution: string;
    summary: string;
  }>;
  hasPlanDiagnostics: boolean;
  showRevisionHistorySubsection: boolean;

  advancedStage2HeadingId: string;
  advancedSnapshotHeadingId: string;
  advancedCommercialHeadingId: string;
  inlineConfirmId: string;

  stage2Selection: DomainKey[];
  toggleStage2Domain: (d: DomainKey) => void;
  stage2Working: boolean;
  handleSaveStage2Intent: () => Promise<void>;
  handleClearSavedStage2Intent: () => Promise<void>;

  preserveBoardIdentityOnRename: boolean;
  setPreserveBoardIdentityOnRename: (v: boolean) => void;
  boardIdentityWorking: boolean;
  handleSaveBoardIdentityPreference: () => Promise<void>;

  manifestSnapshots: RoadmapManifestSnapshotListItem[];
  manifestSnapshotId: string | null;
  setManifestSnapshotId: Dispatch<SetStateAction<string | null>>;
  setScenario: Dispatch<SetStateAction<OrchestrationChangeScenario>>;
  setSeason: Dispatch<SetStateAction<OrchestrationSeasonPreset>>;
  setPlanHorizonStart: Dispatch<SetStateAction<string>>;
  setPlanHorizonEnd: Dispatch<SetStateAction<string>>;
  applySignatureFromManifestPayload: (payload: RoadmapManifestSnapshotListItem['payload']) => void;
  hydratedManifestSnapshotId: MutableRefObject<string | null>;
  handleSaveManifest: () => Promise<void>;
  working: boolean;
  compileMutationPending: boolean;

  commercialOffer: OrchestrationCommercialOfferResponseDto | null;
  commercialWorking: boolean;
  handleProbeCommercialOffer: () => Promise<void>;
  pendingAcceptDomain: keyof typeof DOMAIN_LABELS | null;
  handleCancelInlineAccept: () => void;
  handleConfirmInlineAccept: (domain: keyof typeof DOMAIN_LABELS) => void;
  handleRequestAcceptDomain: (domain: keyof typeof DOMAIN_LABELS) => void;
};

/**
 * Diagnostics, Stage-2 intent, board identity, manifest snapshot history, commercial offers, and hint —
 * previously the Advanced accordion body in {@link StrategyLabOrchestrationPanel}.
 */
export function OrchestrationAdvancedSections(props: OrchestrationAdvancedSectionsProps) {
  const {
    auditId,
    executionPlan,
    strategy,
    pack,
    planGovernance,
    governanceHints,
    revisionHistory,
    roadmapVersionToShow,
    revisionDiffCandidates,
    selectedRevisionDiff,
    selectedRevisionDiffKey,
    setSelectedRevisionDiffKey,
    titleById,
    analysisDepthFilter,
    setAnalysisDepthFilter,
    depthFilteredNodes,
    synthesisConflicts,
    hasPlanDiagnostics,
    showRevisionHistorySubsection,
    advancedStage2HeadingId,
    advancedSnapshotHeadingId,
    advancedCommercialHeadingId,
    inlineConfirmId,
    stage2Selection,
    toggleStage2Domain,
    stage2Working,
    handleSaveStage2Intent,
    handleClearSavedStage2Intent,
    preserveBoardIdentityOnRename,
    setPreserveBoardIdentityOnRename,
    boardIdentityWorking,
    handleSaveBoardIdentityPreference,
    manifestSnapshots,
    manifestSnapshotId,
    setManifestSnapshotId,
    setScenario,
    setSeason,
    setPlanHorizonStart,
    setPlanHorizonEnd,
    applySignatureFromManifestPayload,
    hydratedManifestSnapshotId,
    handleSaveManifest,
    working,
    compileMutationPending,
    commercialOffer,
    commercialWorking,
    handleProbeCommercialOffer,
    pendingAcceptDomain,
    handleCancelInlineAccept,
    handleConfirmInlineAccept,
    handleRequestAcceptDomain,
  } = props;

  return (
    <div className="space-y-5">
      {hasPlanDiagnostics ? (
        <OrchestrationPanelDiagnosticsSection
          embeddedInAdvanced
          planGovernance={planGovernance}
          governanceHints={governanceHints}
          pack={pack}
          showRevisionHistorySubsection={showRevisionHistorySubsection}
          revisionHistory={revisionHistory}
          selectedRevisionDiff={selectedRevisionDiff}
          roadmapVersionToShow={roadmapVersionToShow}
          revisionDiffCandidates={revisionDiffCandidates}
          selectedRevisionDiffKey={selectedRevisionDiffKey}
          setSelectedRevisionDiffKey={setSelectedRevisionDiffKey}
          titleById={titleById}
          analysisDepthFilter={analysisDepthFilter}
          setAnalysisDepthFilter={setAnalysisDepthFilter}
          depthFilteredNodes={depthFilteredNodes}
          synthesisConflicts={synthesisConflicts}
        />
      ) : null}
      {hasPlanDiagnostics ? <hr className="border-border" /> : null}
      <p className="text-muted-foreground text-xs leading-relaxed max-w-prose">
        {STRATEGY_LAB_COPY.orchestrationDisclosure.advancedHint}
      </p>

      {APP_FEATURE_FLAGS.strategyLabDirectorStage2IntentEnabled ? (
        <section aria-labelledby={advancedStage2HeadingId} className="space-y-2">
          <h4 id={advancedStage2HeadingId} className="text-foreground text-xs font-semibold">
            {STRATEGY_LAB_COPY.orchestrationDisclosure.directorStage2Summary}
          </h4>
          <div className="text-muted-foreground text-xs font-semibold">{STRATEGY_LAB_COPY.directorStage2Intent.title}</div>
          <p className="text-muted-foreground text-xs leading-relaxed max-w-prose">{STRATEGY_LAB_COPY.directorStage2Intent.body}</p>
          <div className="text-muted-foreground text-xs font-medium">{STRATEGY_LAB_COPY.directorStage2Intent.domainsLabel}</div>
          <ul className="flex flex-col gap-1">
            {executionPlan.selected_domains.map(d => (
              <li key={d}>
                <label className="text-foreground flex cursor-pointer items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={stage2Selection.includes(d)}
                    onChange={() => toggleStage2Domain(d)}
                    className="border-border rounded border"
                  />
                  <span>{DOMAIN_LABELS[d] ?? d}</span>
                </label>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={stage2Working}
              onClick={() => void handleSaveStage2Intent()}
            >
              {stage2Working ? STRATEGY_LAB_COPY.directorStage2Intent.saving : STRATEGY_LAB_COPY.directorStage2Intent.save}
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={stage2Working} onClick={() => void handleClearSavedStage2Intent()}>
              {STRATEGY_LAB_COPY.directorStage2Intent.clear}
            </Button>
          </div>
          {(strategy.strategy_lab_context?.director_stage2_domains?.length ?? 0) > 0 ? (
            <p className="text-muted-foreground text-xs max-w-prose">
              {STRATEGY_LAB_COPY.directorStage2Intent.selectedSummary}:{' '}
              {(strategy.strategy_lab_context?.director_stage2_domains ?? [])
                .map(d => DOMAIN_LABELS[d] ?? d)
                .join(', ')}
            </p>
          ) : null}
        </section>
      ) : null}

      <hr className="border-border" />

      <section className="space-y-2">
        <h4 className="text-foreground text-xs font-semibold">{STRATEGY_LAB_COPY.boardIdentity.sectionTitle}</h4>
        <p className="text-muted-foreground text-xs leading-relaxed max-w-prose">{STRATEGY_LAB_COPY.boardIdentity.sectionHint}</p>
        <p className="text-muted-foreground text-[length:var(--text-2xs)] leading-relaxed max-w-prose">
          {STRATEGY_LAB_COPY.boardIdentity.deprecatedAuditWideHint}
        </p>
        <label className="text-foreground flex cursor-pointer items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={preserveBoardIdentityOnRename}
            onChange={event => setPreserveBoardIdentityOnRename(event.target.checked)}
            className="border-border rounded border"
          />
          <span>{STRATEGY_LAB_COPY.boardIdentity.checkboxLabel}</span>
        </label>
        {!preserveBoardIdentityOnRename ? (
          <p className="text-muted-foreground text-[length:var(--text-2xs)] max-w-prose">{STRATEGY_LAB_COPY.boardIdentity.warningWhenOff}</p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" size="sm" disabled={boardIdentityWorking} onClick={() => void handleSaveBoardIdentityPreference()}>
            {STRATEGY_LAB_COPY.boardIdentity.save}
          </Button>
        </div>
      </section>

      <hr className="border-border" />

      <section aria-labelledby={advancedSnapshotHeadingId} className="space-y-2">
        <h4 id={advancedSnapshotHeadingId} className="text-foreground text-xs font-semibold">
          {ORCHESTRATION_UI_COPY.snapshotHistoryTitle}
        </h4>
        {manifestSnapshots.length > 0 ? (
          <label className="flex flex-col gap-1">
            <span className="text-muted-foreground text-xs font-medium">{ORCHESTRATION_UI_COPY.snapshotHistoryLabel}</span>
            <select
              className="bg-card text-foreground border-border h-9 rounded-md border px-2 text-xs"
              value={manifestSnapshotId ?? ''}
              onChange={e => {
                const nextId = e.target.value;
                const next = manifestSnapshots.find(row => row.id === nextId);
                setManifestSnapshotId(nextId);
                hydratedManifestSnapshotId.current = null;
                if (next) {
                  setScenario(next.payload.change_scenario);
                  setSeason(next.payload.season_preset);
                  setPlanHorizonStart(next.payload.plan_horizon?.start_date ?? '');
                  setPlanHorizonEnd(next.payload.plan_horizon?.end_date ?? '');
                  applySignatureFromManifestPayload(next.payload);
                  hydratedManifestSnapshotId.current = nextId;
                }
              }}
            >
              {manifestSnapshots.map(row => (
                <option key={row.id} value={row.id}>
                  {formatAppMediumDateTime(row.created_at)} · {ORCHESTRATION_SCENARIO_LABELS[row.payload.change_scenario]} ·{' '}
                  {ORCHESTRATION_SEASON_LABELS[row.payload.season_preset]}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p className="text-muted-foreground text-xs max-w-prose">{ORCHESTRATION_UI_COPY.snapshotHistoryEmpty}</p>
        )}
        <p className="text-muted-foreground text-xs max-w-prose">{ORCHESTRATION_UI_COPY.snapshotVersionHint}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={working || compileMutationPending}
          onClick={() => void handleSaveManifest()}
          aria-label={STRATEGY_LAB_COPY.panel.saveSnapshotSecondaryAria}
        >
          {ORCHESTRATION_UI_COPY.saveManifestSnapshotOnly}
        </Button>
      </section>

      <hr className="border-border" />

      <section aria-labelledby={advancedCommercialHeadingId} className="space-y-2">
        <h4 id={advancedCommercialHeadingId} className="text-foreground text-xs font-semibold">
          {ORCHESTRATION_UI_COPY.commercialOfferTitle}
        </h4>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={commercialWorking}
          onClick={() => void handleProbeCommercialOffer()}
        >
          {commercialWorking ? ORCHESTRATION_UI_COPY.commercialChecking : ORCHESTRATION_UI_COPY.commercialCheckCta}
        </Button>
        {commercialOffer?.offers.length ? (
          <ul className="text-foreground space-y-3 text-xs">
            {commercialOffer.offers.map(row => {
              const isPending = pendingAcceptDomain === row.domain;
              const inlineId = isPending ? `${inlineConfirmId}-${row.domain}` : undefined;
              return (
                <li key={row.domain} className="list-none rounded-md border border-border px-3 py-2 max-w-prose">
                  <div className="font-medium">
                    {row.value_message} ({row.estimated_incremental_effort_weeks}w)
                  </div>
                  <div className="text-muted-foreground mt-1 text-[length:var(--text-2xs)] font-semibold">
                    {ORCHESTRATION_UI_COPY.commercialWhyNowTitle}
                  </div>
                  <ul className="mt-1 list-inside list-disc text-[length:var(--text-2xs)]">
                    {row.why_now_bullets.map((line, i) => (
                      <li key={`${row.domain}-why-${i}`}>{line}</li>
                    ))}
                  </ul>
                  {isPending ? (
                    <div
                      id={inlineId}
                      role="group"
                      aria-labelledby={`${inlineId}-title`}
                      aria-describedby={`${inlineId}-desc`}
                      className="bg-card border-border mt-2 space-y-2 rounded-md border px-3 py-2"
                      onKeyDown={e => {
                        if (e.key === 'Escape') {
                          e.preventDefault();
                          handleCancelInlineAccept();
                        }
                      }}
                    >
                      <h5 id={`${inlineId}-title`} className="text-foreground text-xs font-semibold">
                        {ORCHESTRATION_UI_COPY.commercialConfirmAcceptTitle}
                      </h5>
                      <p id={`${inlineId}-desc`} className="text-muted-foreground text-xs leading-relaxed max-w-prose">
                        {ORCHESTRATION_UI_COPY.commercialConfirmAcceptDescription}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="default" size="sm" autoFocus onClick={() => handleConfirmInlineAccept(row.domain)}>
                          {ORCHESTRATION_UI_COPY.commercialConfirmAcceptConfirm}
                        </Button>
                        <Button type="button" variant="ghost" size="sm" onClick={handleCancelInlineAccept}>
                          {ORCHESTRATION_UI_COPY.commercialConfirmAcceptCancel}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mt-2"
                      aria-haspopup="dialog"
                      onClick={() => handleRequestAcceptDomain(row.domain)}
                    >
                      {ORCHESTRATION_UI_COPY.commercialAcceptCta}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        ) : null}
        {commercialOffer?.base_preview ? (
          <div className="text-muted-foreground space-y-2 text-xs">
            <div className="font-semibold text-foreground">{ORCHESTRATION_UI_COPY.commercialBeforeAfterTitle}</div>
            <div className="max-w-prose">
              <span className="font-medium">{ORCHESTRATION_UI_COPY.commercialBeforeLabel}: </span>
              {commercialOffer.base_preview.lanes_included.map(lane => ORCHESTRATION_LANE_LABELS[lane as OrchestrationLaneId] ?? lane).join(', ')}
            </div>
            {commercialOffer.recalculated_preview ? (
              <div className="max-w-prose">
                <span className="font-medium">{ORCHESTRATION_UI_COPY.commercialAfterLabel}: </span>
                {commercialOffer.recalculated_preview.lanes_included
                  .map(lane => ORCHESTRATION_LANE_LABELS[lane as OrchestrationLaneId] ?? lane)
                  .join(', ')}
              </div>
            ) : null}
          </div>
        ) : null}
        {commercialOffer?.accepted_domain && commercialOffer.recalculated_preview?.lanes_included ? (
          <p className="text-muted-foreground text-xs max-w-prose">
            {ORCHESTRATION_UI_COPY.commercialRecalculatedPrefix}{' '}
            {DOMAIN_LABELS[commercialOffer.accepted_domain] ?? commercialOffer.accepted_domain}:{' '}
            {commercialOffer.recalculated_preview.lanes_included
              .map(lane => ORCHESTRATION_LANE_LABELS[lane as OrchestrationLaneId] ?? lane)
              .join(', ')}
            {commercialOffer.accepted_pack_result?.roadmap_version
              ? ` · v${commercialOffer.accepted_pack_result.roadmap_version}`
              : ''}
          </p>
        ) : null}
        {commercialOffer?.accepted_pack_result ? (
          <div className="border-border space-y-2 rounded-md border px-3 py-2">
            <p className="text-muted-foreground m-0 text-xs max-w-prose">{ORCHESTRATION_UI_COPY.commercialAcceptedReviewTimeline}</p>
            <p className="text-muted-foreground m-0 text-[length:var(--text-2xs)] max-w-prose">
              {ORCHESTRATION_UI_COPY.commercialAcceptedCompareHint}
            </p>
            <TimelineLinkButton auditId={auditId} />
          </div>
        ) : null}
      </section>
    </div>
  );
}
