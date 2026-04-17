import { SectionLabel } from '../../../components/glc/SectionLabel';
import { StatusBadge } from '../../../components/ui/status-badge';
import { PIPELINE_MONITOR_COPY as PM } from '../../../config/pipeline-monitor-copy';
import { PIPELINE_MONITOR_UI_POLICY } from '../config/pipeline-monitor-ui-policy';
import { PhCard, RevBanner } from '../PipelineMonitorPhaseUi';
import type { PhaseView } from '../types';

export function PhaseSidebar(props: {
  phases: PhaseView[];
  selectedPhaseId: number;
  isExpress: boolean;
  isClient: boolean;
  reviewStatusByPhase: Map<number, { status: string }>;
  reviewWarningsByPhase: Map<number, boolean>;
  onSelectPhase: (phaseId: number) => void;
  onOpenReviewModal: (afterPhase: number, label: string) => void;
}) {
  const {
    phases,
    selectedPhaseId,
    isExpress,
    isClient,
    reviewStatusByPhase,
    reviewWarningsByPhase,
    onSelectPhase,
    onOpenReviewModal,
  } = props;

  const phaseSeven = phases[7];

  return (
    <aside
      className={`${PIPELINE_MONITOR_UI_POLICY.layout.sidebarWidthClassName} flex-shrink-0 overflow-y-auto bg-[var(--bg-surface)] flex flex-col gap-1.5 p-3`}
      style={{ borderRight: 'var(--border-width-default) solid var(--border-subtle)' }}
    >
      <div className="px-1 pb-1.5">
        <SectionLabel>{PM.sidebar.phases}</SectionLabel>
      </div>

      <PhCard ph={phases[0]} active={selectedPhaseId === 0} onSel={() => onSelectPhase(0)} />
      <RevBanner
        review={reviewStatusByPhase.get(0) || { status: 'pending' }}
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
        review={reviewStatusByPhase.get(4) || { status: 'pending' }}
        label={isExpress ? PM.reviewPoints.twoFinal : PM.reviewPoints.two}
        onOpenModal={() => onOpenReviewModal(4, isExpress ? PM.reviewPoints.twoFinal : PM.reviewPoints.two)}
        hasWarnings={reviewWarningsByPhase.get(4) ?? false}
        canApprove={!isClient}
      />

      <div className="px-1 pt-2 pb-1 flex items-center gap-2" style={{ opacity: isExpress ? PIPELINE_MONITOR_UI_POLICY.opacity.disabledWing : 1 }}>
        <SectionLabel>{PM.sidebar.analyticWing}</SectionLabel>
        {!isExpress && (
          <StatusBadge
            label={PM.sidebar.parallelBadge}
            toneClassName="border border-[color:var(--glc-blue-alpha-18)] bg-[var(--callout-info-bg)] ds-pipeline-parallel-badge text-[var(--glc-blue)]"
            className="font-[var(--font-display)]"
          />
        )}
      </div>
      <div className="grid grid-cols-2 gap-1.5" style={{ opacity: isExpress ? PIPELINE_MONITOR_UI_POLICY.opacity.disabledWingGrid : 1 }}>
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

      <div className="px-1 pt-2 pb-1" style={{ opacity: isExpress ? PIPELINE_MONITOR_UI_POLICY.opacity.disabledWing : 1 }}>
        <SectionLabel>{PM.sidebar.synthesis}</SectionLabel>
      </div>
      <PhCard ph={phaseSeven} active={selectedPhaseId === 7} onSel={() => !phaseSeven.skipped && onSelectPhase(7)} />

      {!isExpress && (
        <RevBanner
          review={reviewStatusByPhase.get(7) || { status: 'pending' }}
          label={PM.reviewPoints.three}
          onOpenModal={() => onOpenReviewModal(7, PM.reviewPoints.three)}
          hasWarnings={reviewWarningsByPhase.get(7) ?? false}
          canApprove={!isClient}
        />
      )}
    </aside>
  );
}
