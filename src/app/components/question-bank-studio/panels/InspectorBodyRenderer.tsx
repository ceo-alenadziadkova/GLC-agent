import { getQuestionBankReportUse, getQuestionBankSchemaMeta, type QuestionReason } from '@glc/intake-core';
import type { ReactNode } from 'react';

import { POLICY_STRIPE_INSPECTOR } from '../config';
import type { StudioAnyNodeData } from '../../../lib/question-bank-studio-graph';
import type { IntakePlan } from '@glc/intake-core';
import type { Node } from '@xyflow/react';

type InspectorBodyRendererProps = {
  selectedNode: Node<StudioAnyNodeData> | undefined;
  tracePlan: IntakePlan | null;
  emptyStateText: string;
};

export function InspectorBodyRenderer(props: InspectorBodyRendererProps): ReactNode {
  const { selectedNode, tracePlan, emptyStateText } = props;
  if (!selectedNode) {
    return (
      <p className="text-xs m-0" style={{ color: 'var(--text-tertiary)' }}>
        {emptyStateText}
      </p>
    );
  }

  const d = selectedNode.data;
  if (d.kind === 'root') {
    return <p className="text-xs m-0" style={{ color: 'var(--text-secondary)' }}>{d.label}</p>;
  }
  if (d.kind === 'section') {
    return (
      <div className="text-xs space-y-1" style={{ color: 'var(--text-secondary)' }}>
        <div className="flex flex-wrap items-center gap-2">
          <span>Section {d.sectionKey}</span>
          <button
            type="button"
            className="underline-offset-2 hover:underline"
            style={{ color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer' }}
            onClick={() => void navigator.clipboard.writeText(d.sectionKey)}
          >
            Copy section key
          </button>
        </div>
        <div style={{ color: 'var(--text-quaternary)' }}>{d.questionCount} questions in canon</div>
      </div>
    );
  }
  if (d.kind === 'domainCluster') {
    return (
      <div className="text-xs space-y-1" style={{ color: 'var(--text-secondary)' }}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
            {d.domainKey}
          </span>
          <button
            type="button"
            className="underline-offset-2 hover:underline"
            style={{ color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer' }}
            onClick={() => void navigator.clipboard.writeText(d.domainKey)}
          >
            Copy domain key
          </button>
        </div>
        <div>{d.label}</div>
      </div>
    );
  }
  if (d.kind === 'layoutStep') {
    return (
      <div className="text-xs space-y-1" style={{ color: 'var(--text-secondary)' }}>
        <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>
          Layout step ({d.surfaceKey})
        </div>
        <div>{d.label}</div>
      </div>
    );
  }
  if (d.kind === 'identity') {
    return (
      <div className="text-xs space-y-1" style={{ color: 'var(--text-secondary)' }}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono">{d.questionId}</span>
          <button
            type="button"
            className="underline-offset-2 hover:underline"
            style={{ color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer' }}
            onClick={() => void navigator.clipboard.writeText(d.questionId)}
          >
            Copy id
          </button>
        </div>
      </div>
    );
  }

  if (d.kind !== 'question') return null;

  const reportUse = getQuestionBankReportUse(d.questionId);
  const meta = getQuestionBankSchemaMeta(d.questionId);
  return (
    <div className="space-y-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
      <div>
        <span className="font-mono font-semibold" style={{ color: 'var(--glc-blue)' }}>
          {d.questionId}
        </span>
      </div>
      <p className="m-0 leading-relaxed">{d.fullLabel}</p>
      <div style={{ color: 'var(--text-quaternary)' }}>
        Canon priority: {meta?.priority ?? d.priority}
        {d.branchCondition ? ` · branch: ${d.branchCondition}` : ''}
      </div>
      <div style={{ color: 'var(--text-quaternary)', fontSize: 10 }}>
        {POLICY_STRIPE_INSPECTOR[d.policyBaseVisual]}
      </div>
      {reportUse ? (
        <div style={{ color: 'var(--text-quaternary)' }}>
          reportUse: <span className="font-mono">{reportUse}</span>
        </div>
      ) : null}
      {tracePlan ? (
        <div className="space-y-0.5" style={{ color: 'var(--text-quaternary)' }}>
          <div>
            required: {tracePlan.required.includes(d.questionId) ? 'yes' : 'no'} · visible:{' '}
            {tracePlan.visible.includes(d.questionId) ? 'yes' : 'no'} · hidden:{' '}
            {tracePlan.hidden.includes(d.questionId) ? 'yes' : 'no'} · deferred:{' '}
            {tracePlan.deferred.includes(d.questionId) ? 'yes' : 'no'}
          </div>
          {tracePlan.reasonsById?.[d.questionId]?.length ? (
            <ul className="mt-1 mb-0 pl-4 space-y-1" style={{ fontSize: 10 }}>
              {tracePlan.reasonsById[d.questionId]!.map((r: QuestionReason, i: number) => (
                <li key={`${r.code}-${i}`}>
                  <span className="font-mono">{r.layer}</span> · {r.state} · <span className="font-mono">{r.code}</span>
                  {r.detail ? ` — ${r.detail}` : ''}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
