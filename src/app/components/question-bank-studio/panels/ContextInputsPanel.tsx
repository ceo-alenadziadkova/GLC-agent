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
    <div className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-canvas)] p-3 text-left">
      <div className="mb-2 text-[length:var(--text-2xs)] font-semibold uppercase text-[var(--text-tertiary)]">
        Context inputs
      </div>
      <div className="space-y-2 mb-2">
        <label className="block text-[length:var(--text-2xs)] text-[var(--text-quaternary)]">
          Product mode
          <select
            className="mt-0.5 block w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] px-2 py-1 text-xs text-[var(--text-primary)]"
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
        <label className="block text-[length:var(--text-2xs)] text-[var(--text-quaternary)]">
          Collection mode
          <select
            className="mt-0.5 block w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] px-2 py-1 text-xs text-[var(--text-primary)]"
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
        <label className="block text-[length:var(--text-2xs)] text-[var(--text-quaternary)]">
          Surface
          <select
            className="mt-0.5 block w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] px-2 py-1 text-xs text-[var(--text-primary)]"
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
        <label className="block text-[length:var(--text-2xs)] text-[var(--text-quaternary)]">
          Responses JSON
        </label>
        <textarea
          className="min-h-[110px] w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] px-2 py-1.5 font-mono text-xs text-[var(--text-primary)]"
          value={customResponsesText}
          onChange={e => onCustomResponsesTextChange(e.target.value)}
          spellCheck={false}
        />
      </div>
      <div className="text-xs text-[var(--text-secondary)]">
        Policy mode: <span className="font-mono">{policyMode}</span>
      </div>
      <div className="text-xs text-[var(--text-secondary)]">
        Surface: <span className="font-mono">{effectiveLayoutSurface || 'flat'}</span>
      </div>
      <p className="mb-0 mt-2 text-[length:var(--text-2xs)] text-[var(--text-quaternary)]">
        User view fixes orientation to vertical and keeps branch edge labels visible for business conditions.
      </p>
      <button
        type="button"
        className="mt-2 text-xs font-medium px-2 py-1 rounded-md ds-qb-context-show-all"
        onClick={onShowAllSteps}
      >
        Show all steps
      </button>
    </div>
  );
}

