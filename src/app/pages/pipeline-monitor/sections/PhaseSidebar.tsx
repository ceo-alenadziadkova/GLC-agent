import { useEffect, useMemo, useState } from 'react';
import { CaretDown } from '@phosphor-icons/react';
import { SectionLabel } from '../../../components/glc/SectionLabel';
import { StatusBadge } from '../../../components/ui/status-badge';
import { PIPELINE_MONITOR_COPY as PM } from '../../../config/pipeline-monitor-copy';
import { ANALYTIC_WING_IDS, AUTO_WING_IDS } from '../../../lib/pipeline-monitor-helpers';
import { cn } from '../../../components/ui/utils';
import { PIPELINE_MONITOR_UI_POLICY } from '../config/pipeline-monitor-ui-policy';
import { PhCard, RevBanner } from '../PipelineMonitorPhaseUi';
import type { PhaseView } from '../types';
import type { PipelineReview } from '../types-pipeline-state';

const SETUP_PHASE_IDS = [0] as const;
const STRATEGY_PHASE_IDS = [7] as const;

function clientPortalSectionShouldOpen(
  phaseIds: readonly number[],
  currentPhaseId: number,
  selectedPhaseId: number,
  phaseRows: PhaseView[],
): boolean {
  const set = new Set<number>(phaseIds);
  if (set.has(currentPhaseId) || set.has(selectedPhaseId)) return true;
  return phaseRows.some(p => set.has(p.id) && p.status === 'running');
}

function ClientPortalPhaseSection(props: {
  title: string;
  phaseIds: readonly number[];
  currentPhaseId: number;
  selectedPhaseId: number;
  phases: PhaseView[];
  children: React.ReactNode;
}) {
  const { title, phaseIds, currentPhaseId, selectedPhaseId, phases, children } = props;
  const containsCurrentPhase = currentPhaseId >= 0 && phaseIds.includes(currentPhaseId);
  const shouldBeOpen = useMemo(
    () => clientPortalSectionShouldOpen(phaseIds, currentPhaseId, selectedPhaseId, phases),
    [phaseIds, currentPhaseId, selectedPhaseId, phases],
  );
  const [open, setOpen] = useState(shouldBeOpen);
  useEffect(() => {
    if (shouldBeOpen) setOpen(true);
  }, [shouldBeOpen]);

  return (
    <div
      className={cn(
        'rounded-xl border bg-[var(--bg-surface)] transition-[box-shadow] duration-200',
        containsCurrentPhase
          ? 'border-[color-mix(in_oklab,var(--glc-blue)_22%,var(--border-subtle))] shadow-[0_0_0_1px_color-mix(in_oklab,var(--glc-blue)_12%,transparent)]'
          : 'border-[var(--border-subtle)]',
      )}
    >
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-2.5 py-2 text-left"
      >
        <span className="text-xs font-semibold text-[var(--text-primary)]">{title}</span>
        <CaretDown
          className={cn(
            'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
            open ? 'rotate-180' : '',
          )}
          aria-hidden
        />
      </button>
      {!open && containsCurrentPhase ? (
        <p className="text-muted-foreground border-t border-[var(--border-subtle)] px-2.5 py-2 text-[length:var(--text-2xs)] leading-snug">
          {PM.clientPortal.sidebar.currentStepCollapsedHint}
        </p>
      ) : null}
      {open ? <div className="space-y-1.5 border-t border-[var(--border-subtle)] px-2 pb-2.5 pt-2">{children}</div> : null}
    </div>
  );
}

function pendingReviewFallback(afterPhase: number): PipelineReview {
  return { after_phase: afterPhase, status: 'pending', consultant_notes: null, interview_notes: null };
}

export function PhaseSidebar(props: {
  phases: PhaseView[];
  selectedPhaseId: number;
  isExpress: boolean;
  isClient: boolean;
  /** Server `current_phase` — used for portal emphasis and section auto-expand. */
  currentPhaseId: number;
  resizableLayout?: boolean;
  /** Portal mobile: steps panel below detail — full width, top border, capped height. */
  stackedBelowDetail?: boolean;
  reviewByPhase: Map<number, PipelineReview>;
  /** Review gate after the auto wing (`review_points.after_phase`, often 4; partial coverage may be 1–3). */
  autoWingReviewAfterPhase: number;
  reviewWarningsByPhase: Map<number, boolean>;
  onSelectPhase: (phaseId: number) => void;
  onOpenReviewModal: (afterPhase: number, label: string) => void;
}) {
  const {
    phases,
    selectedPhaseId,
    isExpress,
    isClient,
    currentPhaseId,
    resizableLayout = false,
    stackedBelowDetail = false,
    reviewByPhase,
    autoWingReviewAfterPhase,
    reviewWarningsByPhase,
    onSelectPhase,
    onOpenReviewModal,
  } = props;

  const phaseSeven = phases[7];
  const sb = isClient ? PM.clientPortal.sidebar : PM.sidebar;
  const reviewLabels = isClient ? PM.clientPortal.reviewCheckpoints : PM.reviewPoints;
  const portalPol = PIPELINE_MONITOR_UI_POLICY.clientPortal;
  const portalRevCopy = PM.clientPortal.revBanner;

  const phCardCurrent = (phaseId: number) =>
    isClient && currentPhaseId === phaseId ? portalPol.phaseCardCurrentClassName : undefined;

  const portalCurrentStepName = (() => {
    if (currentPhaseId >= 0) {
      const match = phases.find(p => p.id === currentPhaseId);
      if (match) return match.name;
    }
    const sel = phases.find(p => p.id === selectedPhaseId);
    return sel?.name ?? '—';
  })();

  const clientAsideLayout = (() => {
    if (resizableLayout) return 'h-full min-h-0 w-full' as const;
    if (stackedBelowDetail) return PIPELINE_MONITOR_UI_POLICY.clientPortal.mobileStackedStepsAsideClassName;
    return cn(
      PIPELINE_MONITOR_UI_POLICY.layout.sidebarWidthClassName,
      'flex-shrink-0 border-r-[length:var(--border-width-default)] border-r-[var(--border-subtle)]',
    );
  })();

  if (isClient) {
    return (
      <aside
        className={cn(
          'flex flex-col gap-3 overflow-y-auto bg-[var(--bg-surface)] p-3',
          clientAsideLayout,
        )}
      >
        <div className="space-y-2 px-1">
          <SectionLabel>{sb.phases}</SectionLabel>
          <p className="text-xs leading-snug text-muted-foreground">
            <span className="font-semibold text-[var(--text-primary)]">{sb.currentStepLabel}</span>{' '}
            <span className="text-foreground">{portalCurrentStepName}</span>
          </p>
        </div>

        <ClientPortalPhaseSection
          title={sb.sectionRecon}
          phaseIds={SETUP_PHASE_IDS}
          currentPhaseId={currentPhaseId}
          selectedPhaseId={selectedPhaseId}
          phases={phases}
        >
          <PhCard
            ph={phases[0]}
            active={selectedPhaseId === 0}
            onSel={() => onSelectPhase(0)}
            currentHighlightClassName={phCardCurrent(0)}
          />
          <RevBanner
            review={reviewByPhase.get(0) ?? pendingReviewFallback(0)}
            label={reviewLabels.one}
            onOpenModal={() => onOpenReviewModal(0, reviewLabels.one)}
            hasWarnings={reviewWarningsByPhase.get(0) ?? false}
            canApprove={false}
            copy={portalRevCopy}
          />
        </ClientPortalPhaseSection>

        <ClientPortalPhaseSection
          title={sb.foundation}
          phaseIds={AUTO_WING_IDS}
          currentPhaseId={currentPhaseId}
          selectedPhaseId={selectedPhaseId}
          phases={phases}
        >
          <div className="grid grid-cols-1 gap-1.5">
            {phases
              .filter(phase => phase.wing === 'auto')
              .map(phase => (
                <PhCard
                  key={phase.id}
                  ph={phase}
                  active={selectedPhaseId === phase.id}
                  onSel={() => onSelectPhase(phase.id)}
                  currentHighlightClassName={phCardCurrent(phase.id)}
                />
              ))}
          </div>
          <RevBanner
            review={reviewByPhase.get(autoWingReviewAfterPhase) ?? pendingReviewFallback(autoWingReviewAfterPhase)}
            label={isExpress ? reviewLabels.twoFinal : reviewLabels.two}
            onOpenModal={() =>
              onOpenReviewModal(
                autoWingReviewAfterPhase,
                isExpress ? reviewLabels.twoFinal : reviewLabels.two,
              )
            }
            hasWarnings={reviewWarningsByPhase.get(autoWingReviewAfterPhase) ?? false}
            canApprove={false}
            copy={portalRevCopy}
          />
        </ClientPortalPhaseSection>

        <div className={cn(isExpress ? 'opacity-40' : 'opacity-100')}>
          <ClientPortalPhaseSection
            title={sb.domains}
            phaseIds={ANALYTIC_WING_IDS}
            currentPhaseId={currentPhaseId}
            selectedPhaseId={selectedPhaseId}
            phases={phases}
          >
            <div className={cn('grid grid-cols-1 gap-1.5', isExpress ? 'opacity-[0.88]' : '')}>
              {phases
                .filter(phase => phase.wing === 'analytic')
                .map(phase => (
                  <PhCard
                    key={phase.id}
                    ph={phase}
                    active={selectedPhaseId === phase.id}
                    onSel={() => !phase.skipped && onSelectPhase(phase.id)}
                    currentHighlightClassName={phCardCurrent(phase.id)}
                  />
                ))}
            </div>
          </ClientPortalPhaseSection>
        </div>

        <div className={cn(isExpress ? 'opacity-40' : 'opacity-100')}>
          <ClientPortalPhaseSection
            title={sb.synthesis}
            phaseIds={STRATEGY_PHASE_IDS}
            currentPhaseId={currentPhaseId}
            selectedPhaseId={selectedPhaseId}
            phases={phases}
          >
            <PhCard
              ph={phaseSeven}
              active={selectedPhaseId === 7}
              onSel={() => !phaseSeven.skipped && onSelectPhase(7)}
              currentHighlightClassName={phCardCurrent(7)}
            />
            {!isExpress && (
              <RevBanner
                review={reviewByPhase.get(7) ?? pendingReviewFallback(7)}
                label={reviewLabels.three}
                onOpenModal={() => onOpenReviewModal(7, reviewLabels.three)}
                hasWarnings={reviewWarningsByPhase.get(7) ?? false}
                canApprove={false}
                copy={portalRevCopy}
              />
            )}
          </ClientPortalPhaseSection>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className={cn(
        !resizableLayout && PIPELINE_MONITOR_UI_POLICY.layout.sidebarWidthClassName,
        'flex flex-col gap-1.5 overflow-y-auto bg-[var(--bg-surface)] p-3',
        resizableLayout ? 'h-full min-h-0 w-full' : 'flex-shrink-0 border-r-[length:var(--border-width-default)] border-r-[var(--border-subtle)]',
      )}
    >
      <div className="px-1 pb-1.5">
        <SectionLabel>{sb.phases}</SectionLabel>
      </div>

      <PhCard ph={phases[0]} active={selectedPhaseId === 0} onSel={() => onSelectPhase(0)} />
      <RevBanner
        review={reviewByPhase.get(0) ?? pendingReviewFallback(0)}
        label={reviewLabels.one}
        onOpenModal={() => onOpenReviewModal(0, reviewLabels.one)}
        hasWarnings={reviewWarningsByPhase.get(0) ?? false}
        canApprove
      />

      <div className="px-1 pt-2 pb-1 flex items-center gap-2">
        <SectionLabel>{PM.sidebar.autoWing}</SectionLabel>
        <StatusBadge
          label={PM.sidebar.parallelBadge}
          toneClassName="border border-[color:var(--glc-blue-alpha-25)] bg-[var(--glc-blue-alpha-12)] ds-pipeline-parallel-badge text-[var(--glc-blue)]"
          className="font-[var(--font-display)]"
        />
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {phases
          .filter(phase => phase.wing === 'auto')
          .map(phase => (
            <PhCard key={phase.id} ph={phase} active={selectedPhaseId === phase.id} onSel={() => onSelectPhase(phase.id)} />
          ))}
      </div>

      <RevBanner
        review={reviewByPhase.get(autoWingReviewAfterPhase) ?? pendingReviewFallback(autoWingReviewAfterPhase)}
        label={isExpress ? reviewLabels.twoFinal : reviewLabels.two}
        onOpenModal={() =>
          onOpenReviewModal(
            autoWingReviewAfterPhase,
            isExpress ? reviewLabels.twoFinal : reviewLabels.two,
          )
        }
        hasWarnings={reviewWarningsByPhase.get(autoWingReviewAfterPhase) ?? false}
        canApprove
      />

      <div
        className={cn(
          'flex items-center gap-2 px-1 pb-1 pt-2',
          isExpress ? 'opacity-40' : 'opacity-100',
        )}
      >
        <SectionLabel>{PM.sidebar.analyticWing}</SectionLabel>
        {!isExpress && (
          <StatusBadge
            label={PM.sidebar.parallelBadge}
            toneClassName="border border-[color:var(--glc-blue-alpha-18)] bg-[var(--callout-info-bg)] ds-pipeline-parallel-badge text-[var(--glc-blue)]"
            className="font-[var(--font-display)]"
          />
        )}
      </div>
      <div className={cn('grid grid-cols-2 gap-1.5', isExpress ? 'opacity-[0.35]' : 'opacity-100')}>
        {phases
          .filter(phase => phase.wing === 'analytic')
          .map(phase => (
            <PhCard
              key={phase.id}
              ph={phase}
              active={selectedPhaseId === phase.id}
              onSel={() => !phase.skipped && onSelectPhase(phase.id)}
            />
          ))}
      </div>

      <div className={cn('px-1 pb-1 pt-2', isExpress ? 'opacity-40' : 'opacity-100')}>
        <SectionLabel>{sb.synthesis}</SectionLabel>
      </div>
      <PhCard ph={phaseSeven} active={selectedPhaseId === 7} onSel={() => !phaseSeven.skipped && onSelectPhase(7)} />

      {!isExpress && (
        <RevBanner
          review={reviewByPhase.get(7) ?? pendingReviewFallback(7)}
          label={reviewLabels.three}
          onOpenModal={() => onOpenReviewModal(7, reviewLabels.three)}
          hasWarnings={reviewWarningsByPhase.get(7) ?? false}
          canApprove
        />
      )}
    </aside>
  );
}
