import type { Node } from '@xyflow/react';

import type { IntakePlan, QuestionReason } from '@glc/intake-core';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import type { StudioAnyNodeData } from '../../../lib/question-bank-studio-graph';

import type { TracePlanStatus, ViewMode } from '../types';
import { shortUserLabel, statusPill } from '../selectors/trace';
import { NOW_VISIBLE_PREVIEW_MAX_ITEMS, WHY_PREVIEW_MAX_ITEMS } from '../../../config/question-bank-studio-ui';

import type { UserStepSimulationLike } from './types';
import { cn } from '../../../components/ui/utils';

export type InspectorPanelProps = {
  viewMode: ViewMode;
  selectedQuestionRole: string | null;
  selectedDependencies: { dependsOn: string[]; enables: string[] };
  selectedWhy: QuestionReason[];
  simulation: UserStepSimulationLike;
  tracePlan: IntakePlan | null;
  traceError: string | null;
  allQuestionsForReview: { id: string; label: string; status: TracePlanStatus }[];
  inspectorBody: ReactNode;
  layoutGraphNodes: Node<StudioAnyNodeData>[];
  setSelectedId: Dispatch<SetStateAction<string | null>>;
  setPathHistory: Dispatch<SetStateAction<string[]>>;
};

export function InspectorPanel(props: InspectorPanelProps) {
  const {
    viewMode,
    selectedQuestionRole,
    selectedDependencies,
    selectedWhy,
    simulation,
    tracePlan,
    traceError,
    allQuestionsForReview,
    inspectorBody,
    layoutGraphNodes,
    setSelectedId,
    setPathHistory,
  } = props;

  const renderUserQuestionInline = (id: string) => `${shortUserLabel(id)} (${id})`;
  const statusToneClass = (status: TracePlanStatus) => {
    switch (status) {
      case 'required':
        return 'border-warning/50 bg-warning/10 text-warning';
      case 'visible':
        return 'border-info/50 bg-info/10 text-info';
      case 'hidden':
        return 'border-border bg-muted text-muted-foreground';
      case 'deferred':
        return 'border-violet-400/50 bg-violet-400/10 text-violet-300';
      case 'unknown':
      default:
        return 'border-border bg-background text-foreground';
    }
  };

  return (
    <div className="bg-background w-full shrink-0 rounded-lg border p-3 text-left mobile:w-80">
      <div className="text-muted-foreground mb-2 text-[length:var(--text-2xs)] font-semibold uppercase">
        Inspector
      </div>

      {viewMode === 'user' && (
        <div className="mb-3 space-y-2">
          <div className="text-muted-foreground text-[length:var(--text-2xs)] font-semibold uppercase">
            State delta
          </div>
          <div className="text-muted-foreground text-xs">
            Current role: <span className="font-mono">{selectedQuestionRole ?? '—'}</span>
          </div>
          <div>
            <div className="text-muted-foreground mb-1 text-[length:var(--text-2xs)] uppercase">
              Now visible
            </div>
            <ul className="text-muted-foreground m-0 space-y-1 pl-4 text-xs">
              {simulation.nowVisible.length > 0 ? (
                simulation.nowVisible.slice(0, NOW_VISIBLE_PREVIEW_MAX_ITEMS).map(id => (
                  <li key={`now-visible-${id}`}>{renderUserQuestionInline(id)}</li>
                ))
              ) : (
                <li>—</li>
              )}
            </ul>
          </div>
          <div>
            <div className="text-muted-foreground mb-1 text-[length:var(--text-2xs)] uppercase">
              Added next
            </div>
            <ul className="text-muted-foreground m-0 space-y-1 pl-4 text-xs">
              {simulation.addedNext.length > 0 ? (
                simulation.addedNext.map(id => <li key={`added-next-${id}`}>{renderUserQuestionInline(id)}</li>)
              ) : (
                <li>—</li>
              )}
            </ul>
          </div>
          <div>
            <div className="text-muted-foreground mb-1 text-[length:var(--text-2xs)] uppercase">
              Removed next
            </div>
            <ul className="text-muted-foreground m-0 space-y-1 pl-4 text-xs">
              {simulation.removedNext.length > 0 ? (
                simulation.removedNext.map(id => (
                  <li key={`removed-next-${id}`}>{renderUserQuestionInline(id)}</li>
                ))
              ) : (
                <li>—</li>
              )}
            </ul>
          </div>

          <details className="bg-card rounded-md border px-2 py-1.5">
            <summary className="text-muted-foreground cursor-pointer text-[length:var(--text-2xs)] uppercase">
              Next options cards
            </summary>
            <div className="mt-2 space-y-1.5">
              {simulation.nextIds.length === 0 ? (
                <div className="text-muted-foreground text-xs">
                  No direct next options from current question.
                </div>
              ) : (
                simulation.nextIds.map(id => {
                  const node = layoutGraphNodes.find(
                    n => n.type === 'studioQuestion' && n.data.kind === 'question' && n.data.questionId === id,
                  );

                  const status: TracePlanStatus =
                    tracePlan && tracePlan.required.includes(id)
                      ? 'required'
                      : tracePlan && tracePlan.visible.includes(id)
                        ? 'visible'
                        : tracePlan && tracePlan.hidden.includes(id)
                          ? 'hidden'
                          : tracePlan && tracePlan.deferred.includes(id)
                            ? 'deferred'
                            : 'unknown';

                  const pill = statusPill(status);

                  return (
                    <button
                      key={`next-card-${id}`}
                      type="button"
                      className={cn(
                        'text-muted-foreground w-full rounded-md border px-2 py-1.5 text-left',
                        statusToneClass(status),
                        node ? 'cursor-pointer opacity-100' : 'cursor-not-allowed opacity-60',
                      )}
                      disabled={!node}
                      onClick={() => {
                        if (!node) return;
                        setSelectedId(node.id);
                        setPathHistory(prev =>
                          prev[prev.length - 1] === node.id ? prev : [...prev, node.id],
                        );
                      }}
                    >
                      <div className="text-xs font-medium">{shortUserLabel(id)}</div>
                      <div className="text-muted-foreground text-[length:var(--text-2xs)]">
                        id: <span className="font-mono">{id}</span> · status: {status}
                        <span className={cn('ml-1 inline-flex items-center rounded border px-1.5 py-0.5', statusToneClass(status))}>
                          {pill.label}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </details>

          <div>
            <div className="text-muted-foreground mb-1 text-[length:var(--text-2xs)] uppercase">
              Dependencies
            </div>
            <div className="text-muted-foreground space-y-2 text-xs">
              <div>
                <strong>Depends on:</strong>{' '}
                {selectedDependencies.dependsOn.length > 0
                  ? selectedDependencies.dependsOn.map(shortUserLabel).join(', ')
                  : '—'}
              </div>
              <div>
                <strong>Enables:</strong>{' '}
                {selectedDependencies.enables.length > 0
                  ? selectedDependencies.enables.slice(0, NOW_VISIBLE_PREVIEW_MAX_ITEMS).map(shortUserLabel).join(', ')
                  : '—'}
              </div>
            </div>
          </div>

          <div>
            <div className="text-muted-foreground mb-1 text-[length:var(--text-2xs)] uppercase">
              Why
            </div>
            <ul className="text-muted-foreground m-0 space-y-1 pl-4 text-xs">
              {selectedWhy.length === 0 ? (
                <li>No reasons yet.</li>
              ) : (
                selectedWhy.slice(0, WHY_PREVIEW_MAX_ITEMS).map((r, i) => (
                  <li key={`${r.code}-${i}`}>
                    <span className="font-mono">{r.code}</span>
                    {r.detail ? ` — ${r.detail}` : ''}
                  </li>
                ))
              )}
            </ul>
          </div>

          <details className="bg-card rounded-md border px-2 py-1.5">
            <summary className="text-muted-foreground cursor-pointer text-[length:var(--text-2xs)] uppercase">
              Full question list ({allQuestionsForReview.length})
            </summary>
            <button
              type="button"
              className="text-muted-foreground bg-background mt-2 cursor-pointer rounded-md border px-2 py-1 text-xs font-medium"
              onClick={async () => {
                const lines = allQuestionsForReview.map((q, i) => `${i + 1}. ${q.id} | ${q.status} | ${q.label}`);
                await navigator.clipboard.writeText(lines.join('\n'));
              }}
            >
              Copy list for verification
            </button>

            <div className="mt-2 max-h-56 overflow-auto space-y-1">
              {allQuestionsForReview.map(q => {
                return (
                  <div
                    key={`all-q-${q.id}`}
                    className={cn('rounded border px-2 py-1 text-xs', statusToneClass(q.status))}
                  >
                    <span className="font-mono">{q.id}</span> — {q.label}
                  </div>
                );
              })}
            </div>
          </details>
        </div>
      )}

      {inspectorBody}

      {viewMode === 'logic' && (
        <>
          <div
            className="text-muted-foreground mt-4 mb-2 border-t pt-3 text-[length:var(--text-2xs)] font-semibold uppercase"
          >
            Interactive trace
          </div>
          {traceError ? (
            <p className="text-xs m-0 text-red-500">{traceError}</p>
          ) : (
            <p className="text-muted-foreground m-0 text-[length:var(--text-2xs)] leading-relaxed">
              Card left stripe = policy + canon; outer ring = trace outcome. Ring: amber required · blue visible · purple
              deferred · gray hidden (JSON + resolver).
            </p>
          )}
        </>
      )}
    </div>
  );
}

