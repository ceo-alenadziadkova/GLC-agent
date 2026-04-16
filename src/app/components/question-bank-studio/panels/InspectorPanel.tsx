import type { Node } from '@xyflow/react';

import type { IntakePlan, QuestionReason } from '@glc/intake-core';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import type { StudioAnyNodeData } from '../../../lib/question-bank-studio-graph';

import type { TracePlanStatus, ViewMode } from '../types';
import { shortUserLabel, statusPill } from '../selectors/trace';
import { NOW_VISIBLE_PREVIEW_MAX_ITEMS, WHY_PREVIEW_MAX_ITEMS } from '../../../config/question-bank-studio-ui';

import type { UserStepSimulationLike } from './types';

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

  return (
    <div
      className="w-full mobile:w-80 shrink-0 p-3 rounded-lg text-left"
      style={{ backgroundColor: 'var(--bg-canvas)', border: '1px solid var(--border-default)' }}
    >
      <div className="text-[10px] font-semibold uppercase mb-2" style={{ color: 'var(--text-tertiary)' }}>
        Inspector
      </div>

      {viewMode === 'user' && (
        <div className="mb-3 space-y-2">
          <div className="text-[10px] font-semibold uppercase" style={{ color: 'var(--text-tertiary)' }}>
            State delta
          </div>
          <div className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
            Current role: <span className="font-mono">{selectedQuestionRole ?? '—'}</span>
          </div>
          <div>
            <div className="text-[10px] uppercase mb-1" style={{ color: 'var(--text-tertiary)' }}>
              Now visible
            </div>
            <ul className="m-0 pl-4 space-y-1 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
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
            <div className="text-[10px] uppercase mb-1" style={{ color: 'var(--text-tertiary)' }}>
              Added next
            </div>
            <ul className="m-0 pl-4 space-y-1 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
              {simulation.addedNext.length > 0 ? (
                simulation.addedNext.map(id => <li key={`added-next-${id}`}>{renderUserQuestionInline(id)}</li>)
              ) : (
                <li>—</li>
              )}
            </ul>
          </div>
          <div>
            <div className="text-[10px] uppercase mb-1" style={{ color: 'var(--text-tertiary)' }}>
              Removed next
            </div>
            <ul className="m-0 pl-4 space-y-1 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
              {simulation.removedNext.length > 0 ? (
                simulation.removedNext.map(id => (
                  <li key={`removed-next-${id}`}>{renderUserQuestionInline(id)}</li>
                ))
              ) : (
                <li>—</li>
              )}
            </ul>
          </div>

          <details
            className="rounded-md px-2 py-1.5"
            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
          >
            <summary className="cursor-pointer text-[10px] uppercase" style={{ color: 'var(--text-tertiary)' }}>
              Next options cards
            </summary>
            <div className="mt-2 space-y-1.5">
              {simulation.nextIds.length === 0 ? (
                <div className="text-[11px]" style={{ color: 'var(--text-quaternary)' }}>
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
                      className="w-full text-left rounded-md px-2 py-1.5"
                      style={{
                        border: `1px solid ${pill.border}`,
                        backgroundColor: pill.bg,
                        color: 'var(--text-secondary)',
                        cursor: node ? 'pointer' : 'not-allowed',
                        opacity: node ? 1 : 0.6,
                      }}
                      disabled={!node}
                      onClick={() => {
                        if (!node) return;
                        setSelectedId(node.id);
                        setPathHistory(prev =>
                          prev[prev.length - 1] === node.id ? prev : [...prev, node.id],
                        );
                      }}
                    >
                      <div className="text-[11px] font-medium">{shortUserLabel(id)}</div>
                      <div className="text-[10px]" style={{ color: 'var(--text-quaternary)' }}>
                        id: <span className="font-mono">{id}</span> · status: {status}
                        <span
                          className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded"
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
          </details>

          <div>
            <div className="text-[10px] uppercase mb-1" style={{ color: 'var(--text-tertiary)' }}>
              Dependencies
            </div>
            <div className="text-[11px] space-y-2" style={{ color: 'var(--text-secondary)' }}>
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
            <div className="text-[10px] uppercase mb-1" style={{ color: 'var(--text-tertiary)' }}>
              Why
            </div>
            <ul className="m-0 pl-4 space-y-1 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
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

          <details
            className="rounded-md px-2 py-1.5"
            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
          >
            <summary className="cursor-pointer text-[10px] uppercase" style={{ color: 'var(--text-tertiary)' }}>
              Full question list ({allQuestionsForReview.length})
            </summary>
            <button
              type="button"
              className="mt-2 text-[11px] font-medium px-2 py-1 rounded-md"
              style={{
                border: '1px solid var(--border-default)',
                backgroundColor: 'var(--bg-canvas)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
              }}
              onClick={async () => {
                const lines = allQuestionsForReview.map((q, i) => `${i + 1}. ${q.id} | ${q.status} | ${q.label}`);
                await navigator.clipboard.writeText(lines.join('\n'));
              }}
            >
              Copy list for verification
            </button>

            <div className="mt-2 max-h-56 overflow-auto space-y-1">
              {allQuestionsForReview.map(q => {
                const pill = statusPill(q.status);
                return (
                  <div
                    key={`all-q-${q.id}`}
                    className="text-[11px] rounded px-2 py-1"
                    style={{ border: `1px solid ${pill.border}`, backgroundColor: pill.bg, color: pill.fg }}
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
            className="mt-4 pt-3 text-[10px] font-semibold uppercase mb-2 border-t"
            style={{ borderColor: 'var(--border-default)', color: 'var(--text-tertiary)' }}
          >
            Interactive trace
          </div>
          {traceError ? (
            <p className="text-xs m-0 text-red-500">{traceError}</p>
          ) : (
            <p className="text-[10px] m-0 leading-relaxed" style={{ color: 'var(--text-quaternary)' }}>
              Card left stripe = policy + canon; outer ring = trace outcome. Ring: amber required · blue visible · purple
              deferred · gray hidden (JSON + resolver).
            </p>
          )}
        </>
      )}
    </div>
  );
}

