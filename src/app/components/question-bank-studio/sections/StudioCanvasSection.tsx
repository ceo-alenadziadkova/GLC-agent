import type { Node } from '@xyflow/react';

import { shortUserLabel, statusPill } from '../selectors/trace';
import type { StudioAnyNodeData } from '../../../lib/question-bank-studio-graph';
import type { UserStepLane } from '../selectors/visibility';
import type { TracePlanStatus } from '../types';
import { STUDIO_CANVAS_HEIGHT_OFFSET_PX, STUDIO_CANVAS_MIN_HEIGHT_PX } from '../config/studio-layout.config';
import { STUDIO_COPY_EN } from '../config/studio-copy.en';

type StudioCanvasSectionProps = {
  userStepLanes: UserStepLane[];
  activeUserStep: number | null;
  selectedQuestionId: string | null;
  questionNodeIdByQuestionId: Map<string, string>;
  traceStatusByQuestionId: Map<string, TracePlanStatus>;
  layoutGraphNodes: Node<StudioAnyNodeData>[];
  onSelectNode: (nodeId: string) => void;
};

export function StudioCanvasSection(props: StudioCanvasSectionProps) {
  const {
    userStepLanes,
    activeUserStep,
    selectedQuestionId,
    questionNodeIdByQuestionId,
    traceStatusByQuestionId,
    onSelectNode,
  } = props;

  return (
    <div
      className="flex-1 min-w-0 rounded-lg overflow-hidden"
      style={{
        border: '1px solid var(--border-default)',
        height: `calc(100vh - ${STUDIO_CANVAS_HEIGHT_OFFSET_PX}px)`,
        minHeight: STUDIO_CANVAS_MIN_HEIGHT_PX,
      }}
    >
      <div className="h-full overflow-auto p-3 space-y-3" style={{ backgroundColor: 'var(--bg-surface)' }}>
        {userStepLanes.length === 0 ? (
          <div className="text-sm" style={{ color: 'var(--text-quaternary)' }}>
            {STUDIO_COPY_EN.userModeNoStepLayoutHint}
          </div>
        ) : (
          userStepLanes
            .filter(step => activeUserStep === null || step.stepIndex === activeUserStep)
            .map(step => (
              <section
                key={`flow-step-${step.laneId}`}
                className="rounded-lg p-3"
                style={{ border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-canvas)' }}
              >
                <div className="text-xs font-semibold mb-2" style={{ color: 'var(--text-tertiary)' }}>
                  {`Step ${step.stepIndex + 1} — ${step.label}`}
                </div>
                <div className="grid gap-2">
                  {step.questionIds.length === 0 ? (
                    <div className="text-xs" style={{ color: 'var(--text-quaternary)' }}>
                      {STUDIO_COPY_EN.userModeNoQuestionsInStepHint}
                    </div>
                  ) : (
                    step.questionIds.map(questionId => {
                      const nodeId = questionNodeIdByQuestionId.get(questionId);
                      const status = traceStatusByQuestionId.get(questionId) ?? 'unknown';
                      const pill = statusPill(status);
                      const active = selectedQuestionId === questionId;
                      return (
                        <button
                          key={`step-card-${step.laneId}-${questionId}`}
                          type="button"
                          className="w-full text-left rounded-md px-3 py-2"
                          style={{
                            border: `1px solid ${pill.border}`,
                            backgroundColor: active ? pill.bg : 'var(--bg-surface)',
                            color: 'var(--text-secondary)',
                            cursor: nodeId ? 'pointer' : 'not-allowed',
                            opacity: nodeId ? 1 : 0.6,
                          }}
                          disabled={!nodeId}
                          onClick={() => {
                            if (!nodeId) return;
                            onSelectNode(nodeId);
                          }}
                        >
                          <div className="text-xs font-medium">{shortUserLabel(questionId)}</div>
                          <div className="text-[length:var(--text-2xs)] flex items-center gap-1.5" style={{ color: 'var(--text-quaternary)' }}>
                            id: <span className="font-mono">{questionId}</span> · status: {status}
                            <span
                              className="inline-flex items-center px-1.5 py-0.5 rounded"
                              style={{ backgroundColor: pill.bg, color: pill.fg, border: `1px solid ${pill.border}` }}
                            >
                              {pill.label}
                            </span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </section>
            ))
        )}
      </div>
    </div>
  );
}
