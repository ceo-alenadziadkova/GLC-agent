import { useMemo } from 'react';
import { Link } from 'react-router';
import { Path, SlidersHorizontal, DotsThreeOutlineVerticalIcon } from '@phosphor-icons/react';

import type { KeyboardEvent, RefCallback } from 'react';

import { StrategyLabOrchestratorListBody, type StrategyLabOrchestratorTabId } from './StrategyLabOrchestratorListBody';
import { Button } from '../../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { InlineEditableText } from '../../components/glc/InlineEditableText';
import { useStrategyInitiativeInlineEdits } from '../../hooks/useStrategyInitiativeInlineEdits';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../../components/ui/accordion';
import {
  STRATEGY_LAB_UI_BUDGET_BANDS,
  STRATEGY_LAB_UI_COMPANY_STAGES,
  STRATEGY_LAB_UI_TEAM_SCALES,
} from '../../config/strategy-lab-constraints';
import { STRATEGY_LAB_PAGE_ANCHORS } from '../../config/strategy-lab';
import { STRATEGY_LAB_COPY } from '../../config/strategy-lab-copy';
import { usePlanCommandRegistration } from '../../context/PlanCommandRegistryContext';
import { ORCHESTRATION_UI_COPY } from '../../config/orchestration-roadmap-ui-copy.en';
import { DOMAIN_KEYS, DOMAIN_LABELS } from '../../data/auditTypes';
import type { DomainBenchmarkSnapshot } from '../../data/api/benchmarks';
import type { StrategyRoadmap } from '../../data/audit/contracts/report/report-domain.types';
import type { GlcOrchestrationPackView } from '../../data/audit/contracts/report/orchestration-pack.types';
import { cn } from '../../components/ui/utils';
import type { PlanWorkspacePaletteCommand } from '../../lib/plan-command-registry';

export type StrategyLabInspectPackScrollBodyProps = {
  isClient: boolean;
  definePhaseHeadingId: string;
  domainBenchmarks: Partial<Record<(typeof DOMAIN_KEYS)[number], DomainBenchmarkSnapshot | null>>;
  strategy: StrategyRoadmap;
  referencePreviewBenchmarks: string;
  referencePreviewConstraints: string;
  constraintOverridesErrorRegionId: string;
  constraintOverridesSaveErrorMessage: string | null;
  dismissConstraintOverridesSaveError: () => void;
  constraintStageDraft: string;
  constraintBudgetDraft: string;
  constraintTeamDraft: string;
  constraintSaving: boolean;
  onConstraintStageChange: (v: string) => void;
  onConstraintBudgetChange: (v: string) => void;
  onConstraintTeamChange: (v: string) => void;
  onSaveConstraintOverrides: () => void;
  onClearConstraintOverrides: () => void;
  glcPackView: GlcOrchestrationPackView | null;
  orchestratorTablistOverviewId: string;
  orchestratorTab: StrategyLabOrchestratorTabId;
  orchestratorPanelAnnouncement: string;
  selectedPackNodeId: string | null;
  onOrchestratorTabChange: (t: StrategyLabOrchestratorTabId) => void;
  onOrchestratorTablistKeyDown: (e: KeyboardEvent<HTMLElement>) => void;
  setOrchestratorTabButtonRef: (key: StrategyLabOrchestratorTabId) => RefCallback<HTMLButtonElement>;
  onSelectPackNodeId: (id: string | null) => void;
  planExecutionHref: string;
  reportHref: string;
  /** Required for consultant inline initiative title edits (Shape surface). */
  auditId?: string;
  preserveBoardIdentityOnRename?: boolean;
  onTogglePreserveBoardIdentity?: () => void;
};

/** Main scroll column: define context (consultant reference) + shape-pack workbench / client shortcuts. */
export function StrategyLabInspectPackScrollBody(props: StrategyLabInspectPackScrollBodyProps) {
  const {
    isClient,
    definePhaseHeadingId,
    domainBenchmarks,
    strategy,
    referencePreviewBenchmarks,
    referencePreviewConstraints,
    constraintOverridesErrorRegionId,
    constraintOverridesSaveErrorMessage,
    dismissConstraintOverridesSaveError,
    constraintStageDraft,
    constraintBudgetDraft,
    constraintTeamDraft,
    constraintSaving,
    onConstraintStageChange,
    onConstraintBudgetChange,
    onConstraintTeamChange,
    onSaveConstraintOverrides,
    onClearConstraintOverrides,
    glcPackView,
    orchestratorTablistOverviewId,
    orchestratorTab,
    orchestratorPanelAnnouncement,
    selectedPackNodeId,
    onOrchestratorTabChange,
    onOrchestratorTablistKeyDown,
    setOrchestratorTabButtonRef,
    onSelectPackNodeId,
    planExecutionHref,
    reportHref,
    auditId,
    preserveBoardIdentityOnRename = false,
    onTogglePreserveBoardIdentity,
  } = props;

  const {
    isMutatingInitiative,
    commitInitiativeTitle,
    commitInitiativeDescription,
    commitInitiativeBoardIdentityPreference,
  } = useStrategyInitiativeInlineEdits({ auditId });

  const shapePaletteCommands = useMemo((): PlanWorkspacePaletteCommand[] => [], []);

  usePlanCommandRegistration('plan-shape-initiatives', shapePaletteCommands);

  return (
    <>
      {!isClient ? (
        <section
          id={STRATEGY_LAB_PAGE_ANCHORS.definePhase}
          aria-labelledby={definePhaseHeadingId}
          className="ds-strategy-lab-studio-embed-scroll-anchor"
        >
          <h2 id={definePhaseHeadingId} className="sr-only">
            {STRATEGY_LAB_COPY.strategyLabSectionAnchors.definePhaseHeading}
          </h2>
          <section id={STRATEGY_LAB_PAGE_ANCHORS.reference} className="border-border bg-card border-b">
            <Accordion type="single" collapsible className="px-4 [&_[data-slot=accordion-item]]:border-b-0">
              <AccordionItem value="reference">
                <AccordionTrigger className="py-3 hover:no-underline">
                  <span className="flex flex-1 flex-col items-start gap-1 text-left">
                    <span className="text-foreground text-sm font-semibold">
                      {STRATEGY_LAB_COPY.referenceDisclosure.summary}
                    </span>
                    <span className="text-muted-foreground text-[length:var(--text-2xs)] font-normal leading-snug">
                      {referencePreviewBenchmarks} · {referencePreviewConstraints}
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pb-4 pt-1">
                  <p className="text-muted-foreground pb-4 text-xs leading-relaxed max-w-prose">
                    {STRATEGY_LAB_COPY.referenceDisclosure.hint}
                  </p>
                  <div className="border-border space-y-3 border-b pb-4">
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal className="text-info h-4 w-4" aria-hidden />
                      <span className="text-foreground text-sm font-semibold">
                        {STRATEGY_LAB_COPY.panel.domainBenchmarksTitle}
                      </span>
                    </div>
                    <p className="text-muted-foreground max-w-prose text-xs">{STRATEGY_LAB_COPY.panel.domainBenchmarksHint}</p>
                    <div className="space-y-2">
                      {DOMAIN_KEYS.map((dk) => {
                        const row = domainBenchmarks[dk];
                        const label = DOMAIN_LABELS[dk] ?? dk;
                        return (
                          <div
                            key={dk}
                            className="bg-background flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-xs"
                          >
                            <span className="text-muted-foreground">{label}</span>
                            <span className="text-foreground font-mono tabular-nums">
                              {row ? `p50 ${row.percentiles.p50} · n=${row.sample_count}` : STRATEGY_LAB_COPY.panel.emptyBenchmarksValue}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="space-y-3 pt-4">
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal className="text-info h-4 w-4" aria-hidden />
                      <span className="text-foreground text-sm font-semibold">{STRATEGY_LAB_COPY.constraints.sectionTitle}</span>
                    </div>
                    <p className="text-muted-foreground max-w-prose text-xs">{STRATEGY_LAB_COPY.constraints.sectionHint}</p>
                    {constraintOverridesSaveErrorMessage ? (
                      <div
                        id={constraintOverridesErrorRegionId}
                        role="status"
                        aria-live="polite"
                        aria-atomic="true"
                        className="bg-card flex flex-wrap items-start justify-between gap-2 rounded-lg border border-border px-3 py-2"
                      >
                        <p className="text-destructive m-0 max-w-prose text-xs leading-relaxed">
                          {constraintOverridesSaveErrorMessage}
                        </p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 shrink-0 text-xs"
                          onClick={dismissConstraintOverridesSaveError}
                        >
                          {STRATEGY_LAB_COPY.constraints.dismissSaveError}
                        </Button>
                      </div>
                    ) : null}
                    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                      <label className="flex min-w-[length:var(--strategy-lab-form-field-min-width)] flex-1 flex-col gap-1">
                        <span className="text-muted-foreground text-xs font-medium">{STRATEGY_LAB_COPY.constraints.companyStage}</span>
                        <select
                          className="bg-card text-foreground border-border h-9 rounded-md border px-2 text-xs"
                          value={constraintStageDraft}
                          onChange={e => onConstraintStageChange(e.target.value)}
                        >
                          {STRATEGY_LAB_UI_COMPANY_STAGES.map(s => (
                            <option key={s} value={s}>
                              {STRATEGY_LAB_COPY.constraints.optionLabels.stage[s]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="flex min-w-[length:var(--strategy-lab-form-field-min-width)] flex-1 flex-col gap-1">
                        <span className="text-muted-foreground text-xs font-medium">{STRATEGY_LAB_COPY.constraints.budgetBand}</span>
                        <select
                          className="bg-card text-foreground border-border h-9 rounded-md border px-2 text-xs"
                          value={constraintBudgetDraft}
                          onChange={e => onConstraintBudgetChange(e.target.value)}
                        >
                          {STRATEGY_LAB_UI_BUDGET_BANDS.map(b => (
                            <option key={b} value={b}>
                              {STRATEGY_LAB_COPY.constraints.optionLabels.budget[b]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="flex min-w-[length:var(--strategy-lab-form-field-min-width)] flex-1 flex-col gap-1">
                        <span className="text-muted-foreground text-xs font-medium">{STRATEGY_LAB_COPY.constraints.teamScale}</span>
                        <select
                          className="bg-card text-foreground border-border h-9 rounded-md border px-2 text-xs"
                          value={constraintTeamDraft}
                          onChange={e => onConstraintTeamChange(e.target.value)}
                        >
                          {STRATEGY_LAB_UI_TEAM_SCALES.map(t => (
                            <option key={t} value={t}>
                              {STRATEGY_LAB_COPY.constraints.optionLabels.team[t]}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button
                        type="button"
                        variant="default"
                        disabled={constraintSaving}
                        aria-describedby={constraintOverridesSaveErrorMessage ? constraintOverridesErrorRegionId : undefined}
                        onClick={onSaveConstraintOverrides}
                      >
                        {STRATEGY_LAB_COPY.constraints.save}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={constraintSaving}
                        aria-describedby={constraintOverridesSaveErrorMessage ? constraintOverridesErrorRegionId : undefined}
                        onClick={onClearConstraintOverrides}
                      >
                        {STRATEGY_LAB_COPY.constraints.useBrief}
                      </Button>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </section>
        </section>
      ) : null}

      <div className="p-4">
        {!isClient ? (
          <div
            id={STRATEGY_LAB_PAGE_ANCHORS.shapePack}
            tabIndex={-1}
            className="ds-strategy-lab-studio-embed-scroll-anchor outline-none"
            aria-hidden
          >
            <span className="sr-only">{STRATEGY_LAB_COPY.strategyLabSectionAnchors.shapePackHeading}</span>
          </div>
        ) : null}
        {glcPackView && !isClient ? (
          <div className="space-y-4">
            <p id={orchestratorTablistOverviewId} className="sr-only">
              {STRATEGY_LAB_COPY.orchestratorTabs.tablistAriaDescription}
            </p>
            <div
              role="tablist"
              aria-label={STRATEGY_LAB_COPY.orchestratorTabs.tablistAriaLabel}
              aria-describedby={orchestratorTablistOverviewId}
              className="border-border flex flex-wrap gap-2 border-b pb-3"
              onKeyDown={onOrchestratorTablistKeyDown}
            >
              {(
                [
                  ['now', STRATEGY_LAB_COPY.orchestratorTabs.now, STRATEGY_LAB_COPY.orchestratorTabs.nowDesc],
                  ['next', STRATEGY_LAB_COPY.orchestratorTabs.next, STRATEGY_LAB_COPY.orchestratorTabs.nextDesc],
                  ['dependencies', STRATEGY_LAB_COPY.orchestratorTabs.dependencies, STRATEGY_LAB_COPY.orchestratorTabs.dependenciesDesc],
                  ['risks', STRATEGY_LAB_COPY.orchestratorTabs.risks, STRATEGY_LAB_COPY.orchestratorTabs.risksDesc],
                ] as const
              ).map(([key, label, desc]) => (
                <button
                  key={key}
                  ref={setOrchestratorTabButtonRef(key)}
                  type="button"
                  id={`strategy-lab-orchestrator-tab-${key}`}
                  role="tab"
                  aria-selected={orchestratorTab === key}
                  aria-controls="strategy-lab-orchestrator-panel"
                  tabIndex={orchestratorTab === key ? 0 : -1}
                  onClick={() => onOrchestratorTabChange(key)}
                  className={cn(
                    'flex min-w-[length:var(--strategy-lab-orchestrator-tab-min-width)] flex-1 flex-col items-start rounded-lg border px-3 py-2 text-left text-xs transition-colors sm:min-w-0 sm:flex-none',
                    orchestratorTab === key
                      ? 'border-primary/40 bg-primary/10 text-foreground'
                      : 'border-border bg-card text-muted-foreground hover:text-foreground',
                  )}
                >
                  <span className="font-semibold">{label}</span>
                  <span className="text-[length:var(--text-2xs)] leading-snug opacity-90">{desc}</span>
                </button>
              ))}
            </div>
            <div
              role="tabpanel"
              id="strategy-lab-orchestrator-panel"
              aria-labelledby={`strategy-lab-orchestrator-tab-${orchestratorTab}`}
            >
              <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
                {orchestratorPanelAnnouncement}
              </span>
              <StrategyLabOrchestratorListBody
                pack={glcPackView}
                tab={orchestratorTab}
                selectedNodeId={props.selectedPackNodeId}
                onSelectNode={props.onSelectPackNodeId}
              />
            </div>
            <section className="border-border mt-6 space-y-4 border-t pt-4" aria-labelledby="strategy-lab-initiatives-heading">
              <h3 id="strategy-lab-initiatives-heading" className="text-foreground text-sm font-semibold">
                {STRATEGY_LAB_COPY.boardIdentity.initiativeSectionTitle}
              </h3>
              <p className="text-muted-foreground max-w-prose text-xs leading-relaxed">
                {STRATEGY_LAB_COPY.boardIdentity.initiativeSectionHint}
              </p>
              {(
                [
                  ['quick_wins', STRATEGY_LAB_COPY.boardIdentity.bucketQuickWins],
                  ['medium_term', STRATEGY_LAB_COPY.boardIdentity.bucketMediumTerm],
                  ['strategic', STRATEGY_LAB_COPY.boardIdentity.bucketStrategic],
                ] as const
              ).map(([bucket, bucketLabel]) => (
                <div key={bucket} className="space-y-2">
                  <h4 className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">{bucketLabel}</h4>
                  <ul className="space-y-2">
                    {(strategy[bucket] ?? []).map(init => (
                      <li
                        key={init.id}
                        className="bg-card flex flex-wrap items-center gap-2 rounded-lg border border-border px-3 py-2"
                      >
                        <div className="flex min-w-0 flex-1 items-start gap-2">
                          {auditId && !isClient ? (
                            <div className="min-w-0 flex-1 space-y-1">
                              <InlineEditableText
                                value={init.title}
                                ariaLabel={STRATEGY_LAB_COPY.boardIdentity.initiativeRowInlineTitleAria}
                                onCommit={next =>
                                  commitInitiativeTitle({
                                    bucket,
                                    initiative: init,
                                    title: next,
                                  })
                                }
                                disabled={isMutatingInitiative}
                                minLength={2}
                                maxLength={200}
                                className="text-foreground min-w-0 flex-1 text-sm font-medium leading-snug"
                              />
                              <InlineEditableText
                                value={init.description}
                                ariaLabel={STRATEGY_LAB_COPY.boardIdentity.initiativeRowInlineDescriptionAria}
                                onCommit={next =>
                                  commitInitiativeDescription({
                                    bucket,
                                    initiative: init,
                                    description: next,
                                  })
                                }
                                disabled={isMutatingInitiative}
                                minLength={2}
                                maxLength={400}
                                className="text-muted-foreground min-w-0 flex-1 text-xs leading-snug"
                              />
                              <label className="text-foreground flex cursor-pointer items-center gap-2 text-[length:var(--text-2xs)]">
                                <input
                                  type="checkbox"
                                  checked={typeof init.board_identity_key === 'string' && init.board_identity_key.length > 0}
                                  disabled={isMutatingInitiative}
                                  onChange={e => {
                                    void commitInitiativeBoardIdentityPreference({
                                      bucket,
                                      initiative: init,
                                      preserveBoardIdentity: e.target.checked,
                                    });
                                  }}
                                  className="border-border rounded border"
                                />
                                <span>{STRATEGY_LAB_COPY.boardIdentity.checkboxLabel}</span>
                              </label>
                            </div>
                          ) : (
                            <div className="min-w-0 flex-1 space-y-1">
                              <span className="text-foreground min-w-0 flex-1 text-sm font-medium leading-snug">{init.title}</span>
                              <p className="text-muted-foreground text-xs leading-snug">{init.description}</p>
                            </div>
                          )}
                          {!isClient ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="border-border h-8 shrink-0 px-2"
                                  aria-label={STRATEGY_LAB_COPY.boardIdentity.initiativeRowMenuAria}
                                >
                                  <DotsThreeOutlineVerticalIcon size={16} aria-hidden />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" collisionPadding={8}>
                                {onTogglePreserveBoardIdentity ? (
                                  <DropdownMenuItem
                                    className="cursor-pointer"
                                    onSelect={() => {
                                      onTogglePreserveBoardIdentity();
                                    }}
                                  >
                                    {preserveBoardIdentityOnRename
                                      ? STRATEGY_LAB_COPY.boardIdentity.initiativeRowMenuPreserveIdentityDisable
                                      : STRATEGY_LAB_COPY.boardIdentity.initiativeRowMenuPreserveIdentityEnable}
                                  </DropdownMenuItem>
                                ) : null}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          </div>
        ) : (
          <div className="bg-background rounded-xl border p-4">
            <p className="text-foreground text-sm font-semibold">{STRATEGY_LAB_COPY.workbenchSegment.planLabel}</p>
            <p className="text-muted-foreground mt-1 max-w-prose text-xs leading-relaxed">
              {STRATEGY_LAB_COPY.workbenchSegment.surfaceHint}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm" className="no-underline">
                <Link to={planExecutionHref}>
                  <Path className="h-4 w-4" aria-hidden />
                  {ORCHESTRATION_UI_COPY.clientOpenPlanSurface}
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm" className="no-underline">
                <Link to={reportHref}>{STRATEGY_LAB_COPY.panel.viewReport}</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
