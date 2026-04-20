import { SectionLabel } from '../../../components/glc/SectionLabel';
import { StatusBadge } from '../../../components/ui/status-badge';
import { PIPELINE_MONITOR_COPY as PM } from '../../../config/pipeline-monitor-copy';
import { cn } from '../../../components/ui/utils';
import { PIPELINE_MONITOR_UI_POLICY } from '../config/pipeline-monitor-ui-policy';
import { PhCard, RevBanner } from '../PipelineMonitorPhaseUi';
import type { PhaseView } from '../types';
import type { PipelineReview } from '../types-pipeline-state';

function pendingReviewFallback(afterPhase: number): PipelineReview {
  return { after_phase: afterPhase, status: 'pending', consultant_notes: null, interview_notes: null };
}

export function PhaseSidebar(props: {
  phases: PhaseView[];
  selectedPhaseId: number;
  isExpress: boolean;
  isClient: boolean;
  resizableLayout?: boolean;
  reviewByPhase: Map<number, PipelineReview>;
  reviewWarningsByPhase: Map<number, boolean>;
  onSelectPhase: (phaseId: number) => void;
  onOpenReviewModal: (afterPhase: number, label: string) => void;
}) {
  const {
    phases,
    selectedPhaseId,
    isExpress,
    isClient,
    resizableLayout = false,
    reviewByPhase,
    reviewWarningsByPhase,
    onSelectPhase,
    onOpenReviewModal,
  } = props;

  const phaseSeven = phases[7];

  return (
    <aside
      className={cn(
        !resizableLayout && PIPELINE_MONITOR_UI_POLICY.layout.sidebarWidthClassName,
        'flex flex-col gap-1.5 overflow-y-auto bg-[var(--bg-surface)] p-3',
        resizableLayout
          ? 'h-full min-h-0 w-full'
          : 'flex-shrink-0 border-r-[length:var(--border-width-default)] border-r-[var(--border-subtle)]',
      )}
    >
      <div className="px-1 pb-1.5">
        <SectionLabel>{PM.sidebar.phases}</SectionLabel>
      </div>

      <PhCard ph={phases[0]} active={selectedPhaseId === 0} onSel={() => onSelectPhase(0)} />
      <RevBanner
        review={reviewByPhase.get(0) ?? pendingReviewFallback(0)}
        label={PM.reviewPoints.one}
        onOpenModal={() => onOpenReviewModal(0, PM.reviewPoints.one)}
        hasWarnings={reviewWarningsByPhase.get(0) ?? false}
        canApprove={!isClient}
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
        review={reviewByPhase.get(4) ?? pendingReviewFallback(4)}
        label={isExpress ? PM.reviewPoints.twoFinal : PM.reviewPoints.two}
        onOpenModal={() => onOpenReviewModal(4, isExpress ? PM.reviewPoints.twoFinal : PM.reviewPoints.two)}
        hasWarnings={reviewWarningsByPhase.get(4) ?? false}
        canApprove={!isClient}
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
        <SectionLabel>{PM.sidebar.synthesis}</SectionLabel>
      </div>
      <PhCard ph={phaseSeven} active={selectedPhaseId === 7} onSel={() => !phaseSeven.skipped && onSelectPhase(7)} />

      {!isExpress && (
        <RevBanner
          review={reviewByPhase.get(7) ?? pendingReviewFallback(7)}
          label={PM.reviewPoints.three}
          onOpenModal={() => onOpenReviewModal(7, PM.reviewPoints.three)}
          hasWarnings={reviewWarningsByPhase.get(7) ?? false}
          canApprove={!isClient}
        />
      )}
    </aside>
  );
}
