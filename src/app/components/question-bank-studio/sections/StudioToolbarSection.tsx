import type { StudioLayoutSurfaceKey } from '../../../lib/question-bank-studio-graph';
import type { StudioPolicyMode } from '../../../lib/question-bank-studio-policy';

import { QUESTION_BANK_STUDIO_COPY_EN } from '../../../config/question-bank-studio-copy.en';
import { Switch } from '../../ui/switch';
import { LAYOUT_SURFACE_OPTIONS, POLICY_MODE_OPTIONS } from '../config';

type StudioToolbarSectionProps = {
  viewMode: 'user' | 'logic';
  layoutSurface: '' | StudioLayoutSurfaceKey;
  graphOrientation: 'TB' | 'LR';
  policyMode: StudioPolicyMode;
  showBranchEdges: boolean;
  dimOutsidePolicy: boolean;
  policySliceOnly: boolean;
  viewDensity: 'comfortable' | 'compact';
  overviewUi: boolean;
  branchFocusFromSelection: boolean;
  colorByDomain: boolean;
  clusterByPrimaryDomain: boolean;
  planFootprintOnly: boolean;
  tracePlanReady: boolean;
  exportBusy: boolean;
  onLayoutSurfaceChange: (next: '' | StudioLayoutSurfaceKey) => void;
  onGraphOrientationChange: (next: 'TB' | 'LR') => void;
  onPolicyModeChange: (next: StudioPolicyMode) => void;
  onShowBranchEdgesChange: (next: boolean) => void;
  onDimOutsidePolicyChange: (next: boolean) => void;
  onPolicySliceOnlyChange: (next: boolean) => void;
  onViewDensityChange: (next: 'comfortable' | 'compact') => void;
  onOverviewUiChange: (next: boolean) => void;
  onBranchFocusFromSelectionChange: (next: boolean) => void;
  onColorByDomainChange: (next: boolean) => void;
  onClusterByPrimaryDomainChange: (next: boolean) => void;
  onPlanFootprintOnlyChange: (next: boolean) => void;
  onExportSvg: () => void;
  onExportPng: () => void;
};

export function StudioToolbarSection(props: StudioToolbarSectionProps) {
  const {
    viewMode,
    layoutSurface,
    graphOrientation,
    policyMode,
    showBranchEdges,
    dimOutsidePolicy,
    policySliceOnly,
    viewDensity,
    overviewUi,
    branchFocusFromSelection,
    colorByDomain,
    clusterByPrimaryDomain,
    planFootprintOnly,
    tracePlanReady,
    exportBusy,
    onLayoutSurfaceChange,
    onGraphOrientationChange,
    onPolicyModeChange,
    onShowBranchEdgesChange,
    onDimOutsidePolicyChange,
    onPolicySliceOnlyChange,
    onViewDensityChange,
    onOverviewUiChange,
    onBranchFocusFromSelectionChange,
    onColorByDomainChange,
    onClusterByPrimaryDomainChange,
    onPlanFootprintOnlyChange,
    onExportSvg,
    onExportPng,
  } = props;

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <span className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
        {QUESTION_BANK_STUDIO_COPY_EN.viewModeButtons.flowSimulator}
      </span>
      {viewMode === 'logic' && (
        <label className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
          {QUESTION_BANK_STUDIO_COPY_EN.toolbar.layoutSurface}
          <select
            className="ml-1 block mt-1 px-2 py-1.5 text-xs rounded-md max-w-[200px]"
            style={{ backgroundColor: 'var(--bg-canvas)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
            value={layoutSurface}
            onChange={e => onLayoutSurfaceChange(e.target.value as '' | StudioLayoutSurfaceKey)}
          >
            {LAYOUT_SURFACE_OPTIONS.map(o => (
              <option key={o.value || 'flat'} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
      )}
      {viewMode === 'logic' && (
        <label className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
          {QUESTION_BANK_STUDIO_COPY_EN.toolbar.orientation}
          <select
            className="ml-1 block mt-1 px-2 py-1.5 text-xs rounded-md"
            style={{ backgroundColor: 'var(--bg-canvas)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
            value={graphOrientation}
            onChange={e => onGraphOrientationChange(e.target.value as 'TB' | 'LR')}
          >
            <option value="TB">Vertical (top-bottom)</option>
            <option value="LR">Horizontal (left-right)</option>
          </select>
        </label>
      )}
      {viewMode === 'logic' && (
        <label className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
          {QUESTION_BANK_STUDIO_COPY_EN.toolbar.policyMode}
          <select
            className="ml-1 block mt-1 px-2 py-1.5 text-xs rounded-md"
            style={{ backgroundColor: 'var(--bg-canvas)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
            value={policyMode}
            onChange={e => onPolicyModeChange(e.target.value as StudioPolicyMode)}
          >
            {POLICY_MODE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
      )}
      {viewMode === 'logic' && (
        <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <Switch checked={showBranchEdges} onCheckedChange={onShowBranchEdgesChange} />
          {QUESTION_BANK_STUDIO_COPY_EN.toolbar.branchEdges}
        </label>
      )}
      {viewMode === 'logic' && (
        <>
          <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <Switch checked={dimOutsidePolicy} onCheckedChange={onDimOutsidePolicyChange} />
            {QUESTION_BANK_STUDIO_COPY_EN.toolbar.dimOutsidePolicyMode}
          </label>
          <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <Switch checked={policySliceOnly} onCheckedChange={onPolicySliceOnlyChange} />
            {QUESTION_BANK_STUDIO_COPY_EN.toolbar.policySlice}
          </label>
          <label className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
            {QUESTION_BANK_STUDIO_COPY_EN.toolbar.density}
            <select
              className="ml-1 block mt-1 px-2 py-1.5 text-xs rounded-md"
              style={{ backgroundColor: 'var(--bg-canvas)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
              value={viewDensity}
              onChange={e => onViewDensityChange(e.target.value as 'comfortable' | 'compact')}
            >
              <option value="comfortable">Comfortable</option>
              <option value="compact">Compact</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <Switch checked={overviewUi} onCheckedChange={onOverviewUiChange} />
            {QUESTION_BANK_STUDIO_COPY_EN.toolbar.overviewUi}
          </label>
          <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <Switch checked={branchFocusFromSelection} onCheckedChange={onBranchFocusFromSelectionChange} />
            {QUESTION_BANK_STUDIO_COPY_EN.toolbar.branchFocus}
          </label>
          <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <Switch checked={colorByDomain} onCheckedChange={onColorByDomainChange} />
            {QUESTION_BANK_STUDIO_COPY_EN.toolbar.colorByFeedDomain}
          </label>
          <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <Switch checked={clusterByPrimaryDomain} onCheckedChange={onClusterByPrimaryDomainChange} />
            {QUESTION_BANK_STUDIO_COPY_EN.toolbar.clusterByPrimaryDomain}
          </label>
          <label className={`flex items-center gap-2 text-xs ${!tracePlanReady ? 'opacity-50' : ''}`} style={{ color: 'var(--text-secondary)' }}>
            <Switch checked={planFootprintOnly} disabled={!tracePlanReady} onCheckedChange={onPlanFootprintOnlyChange} />
            {QUESTION_BANK_STUDIO_COPY_EN.toolbar.planFootprint}
          </label>
          <div className="flex flex-wrap gap-1 items-center">
            <button type="button" disabled={exportBusy} className="text-xs font-medium px-2 py-1.5 rounded-md"
              style={{ border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-canvas)', color: 'var(--text-secondary)', cursor: exportBusy ? 'wait' : 'pointer', opacity: exportBusy ? 0.6 : 1 }}
              onClick={onExportSvg}>
              {QUESTION_BANK_STUDIO_COPY_EN.toolbar.exportSvg}
            </button>
            <button type="button" disabled={exportBusy} className="text-xs font-medium px-2 py-1.5 rounded-md"
              style={{ border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-canvas)', color: 'var(--text-secondary)', cursor: exportBusy ? 'wait' : 'pointer', opacity: exportBusy ? 0.6 : 1 }}
              onClick={onExportPng}>
              {exportBusy ? QUESTION_BANK_STUDIO_COPY_EN.toolbar.pngBusy : QUESTION_BANK_STUDIO_COPY_EN.toolbar.exportPng}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
