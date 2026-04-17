import type { IntakeBriefCollectionMode, ProductMode } from '../../../data/auditTypes';
import type { IntakeSurface } from '@glc/intake-core';
import { INTAKE_WORDING_WORKSPACE_COPY as W } from '../../../config/intake-wording-workspace-copy';
import { COLLECTION_OPTIONS, PRODUCT_OPTIONS, SURFACE_OPTIONS } from '../config';

export function TraceControlsForm(props: {
  productMode: ProductMode;
  collectionMode: IntakeBriefCollectionMode | '';
  surface: IntakeSurface | '';
  responsesText: string;
  onProductModeChange: (value: ProductMode) => void;
  onCollectionModeChange: (value: IntakeBriefCollectionMode | '') => void;
  onSurfaceChange: (value: IntakeSurface | '') => void;
  onResponsesTextChange: (value: string) => void;
  displayError: string | null;
}) {
  const {
    productMode,
    collectionMode,
    surface,
    responsesText,
    onProductModeChange,
    onCollectionModeChange,
    onSurfaceChange,
    onResponsesTextChange,
    displayError,
  } = props;
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{W.fields.productMode}</span>
          <select className="glc-input" value={productMode} onChange={e => onProductModeChange(e.target.value as ProductMode)}>
            {PRODUCT_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{W.fields.collectionMode}</span>
          <select className="glc-input" value={collectionMode} onChange={e => onCollectionModeChange(e.target.value as IntakeBriefCollectionMode | '')}>
            {COLLECTION_OPTIONS.map(option => (
              <option key={option.value || 'omit'} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{W.fields.surface}</span>
          <select className="glc-input" value={surface} onChange={e => onSurfaceChange(e.target.value as IntakeSurface | '')}>
            {SURFACE_OPTIONS.map(option => (
              <option key={option.value || 'omit'} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">{W.fields.responsesJson}</span>
        <textarea
          className="glc-input font-mono text-xs min-h-[140px]"
          value={responsesText}
          onChange={e => onResponsesTextChange(e.target.value)}
          spellCheck={false}
        />
      </label>

      {displayError && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {displayError}
        </div>
      )}
    </>
  );
}
