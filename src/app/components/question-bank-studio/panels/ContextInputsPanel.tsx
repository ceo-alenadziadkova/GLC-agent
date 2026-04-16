import type { IntakeBriefCollectionMode, ProductMode } from '../../../data/auditTypes';
import type { IntakeSurface } from '@glc/intake-core';

import { TRACE_COLLECTION_OPTIONS, TRACE_PRODUCT_OPTIONS, TRACE_SURFACE_OPTIONS } from '../config';
import type { StudioPolicyMode } from '../../../lib/question-bank-studio-policy';
import type { StudioLayoutSurfaceKey } from '../../../lib/question-bank-studio-graph';

type ContextInputsPanelProps = {
  customProductMode: ProductMode;
  onCustomProductModeChange: (next: ProductMode) => void;
  customCollectionMode: IntakeBriefCollectionMode | '';
  onCustomCollectionModeChange: (next: IntakeBriefCollectionMode | '') => void;
  customSurface: IntakeSurface | '';
  onCustomSurfaceChange: (next: IntakeSurface | '') => void;
  customResponsesText: string;
  onCustomResponsesTextChange: (next: string) => void;
  policyMode: StudioPolicyMode;
  effectiveLayoutSurface: '' | StudioLayoutSurfaceKey;
  onShowAllSteps: () => void;
};

export function ContextInputsPanel(props: ContextInputsPanelProps) {
  const {
    customProductMode,
    onCustomProductModeChange,
    customCollectionMode,
    onCustomCollectionModeChange,
    customSurface,
    onCustomSurfaceChange,
    customResponsesText,
    onCustomResponsesTextChange,
    policyMode,
    effectiveLayoutSurface,
    onShowAllSteps,
  } = props;

  return (
    <div className="w-full p-3 rounded-lg text-left" style={{ backgroundColor: 'var(--bg-canvas)', border: '1px solid var(--border-default)' }}>
      <div className="text-[10px] font-semibold uppercase mb-2" style={{ color: 'var(--text-tertiary)' }}>
        Context inputs
      </div>
      <div className="space-y-2 mb-2">
        <label className="text-[10px] block" style={{ color: 'var(--text-quaternary)' }}>
          Product mode
          <select
            className="block w-full mt-0.5 px-2 py-1 text-xs rounded-md"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-primary)',
            }}
            value={customProductMode}
            onChange={e => onCustomProductModeChange(e.target.value as ProductMode)}
          >
            {TRACE_PRODUCT_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[10px] block" style={{ color: 'var(--text-quaternary)' }}>
          Collection mode
          <select
            className="block w-full mt-0.5 px-2 py-1 text-xs rounded-md"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-primary)',
            }}
            value={customCollectionMode}
            onChange={e => onCustomCollectionModeChange(e.target.value as IntakeBriefCollectionMode | '')}
          >
            {TRACE_COLLECTION_OPTIONS.map(o => (
              <option key={o.value || 'none'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[10px] block" style={{ color: 'var(--text-quaternary)' }}>
          Surface
          <select
            className="block w-full mt-0.5 px-2 py-1 text-xs rounded-md"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-primary)',
            }}
            value={customSurface}
            onChange={e => onCustomSurfaceChange(e.target.value as IntakeSurface | '')}
          >
            {TRACE_SURFACE_OPTIONS.map(o => (
              <option key={o.value || 'none'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[10px] block" style={{ color: 'var(--text-quaternary)' }}>
          Responses JSON
        </label>
        <textarea
          className="w-full min-h-[110px] px-2 py-1.5 text-[11px] font-mono rounded-md"
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-primary)',
          }}
          value={customResponsesText}
          onChange={e => onCustomResponsesTextChange(e.target.value)}
          spellCheck={false}
        />
      </div>
      <div className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
        Policy mode: <span className="font-mono">{policyMode}</span>
      </div>
      <div className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
        Surface: <span className="font-mono">{effectiveLayoutSurface || 'flat'}</span>
      </div>
      <p className="mt-2 mb-0 text-[10px]" style={{ color: 'var(--text-quaternary)' }}>
        User view fixes orientation to vertical and keeps branch edge labels visible for business conditions.
      </p>
      <button
        type="button"
        className="mt-2 text-[11px] font-medium px-2 py-1 rounded-md"
        style={{
          border: '1px solid var(--border-default)',
          backgroundColor: 'var(--bg-surface)',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
        }}
        onClick={onShowAllSteps}
      >
        Show all steps
      </button>
    </div>
  );
}

