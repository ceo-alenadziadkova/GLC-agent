/**
 * Question Bank Studio UI copy (English).
 * Note: some Russian helper strings remain in the component until they are extracted in a later chunk.
 */
export const QUESTION_BANK_STUDIO_COPY_EN = {
  headerTitle: 'Question Bank Studio',
  viewModeButtons: {
    flowSimulator: 'Flow simulator',
    fullMap: 'Full map',
  },
  toolbar: {
    layoutSurface: 'Layout surface',
    orientation: 'Orientation',
    policyMode: 'Policy mode',
    branchEdges: 'Branch edges',
    dimOutsidePolicyMode: 'Dim outside policy mode',
    policySlice: 'Policy slice',
    density: 'Density',
    overviewUi: 'Overview UI',
    branchFocus: 'Branch focus',
    colorByFeedDomain: 'Color by feed domain',
    clusterByPrimaryDomain: 'Cluster by primary domain',
    planFootprint: 'Plan footprint',
    exportSvg: 'Export SVG',
    exportPng: 'Export PNG',
    pngBusy: 'PNG…',
  },
  panels: {
    currentMode: 'Current mode',
    runtimeTrace: 'Runtime trace',
    intelligenceContract: 'Intelligence contract (repo)',
    sprint2GateLabel: 'Sprint 2 gate',
    bankCoverageLabel: 'Bank required_now coverage',
  },
  search: {
    placeholder: 'Search id or label (debounced center on first match)…',
  },
  legend: {
    title: 'Legend (node types)',
    solidEdges: 'Solid edges: structure · Blue dashed: branch (canon)',
    questionLeftStripe:
      'Question left stripe: orange policy req · amber if-visible · blue canon req · gray rec/opt',
    traceRingOuter: 'Trace ring (outer): amber req · blue vis · purple def · gray hid',
    feedDomain: 'Feed domain: thin top color when "Color by feed domain" is on',
    search: 'Search: orange outline on matches · minimap bottom · Fit top-left on canvas',
  },
  inspector: {
    selectNodeOnCanvas: 'Select a node on the canvas.',
  },
  user: {
    breadcrumbsEmpty: 'Select a question node to start simulation path.',
    noStepLayout: 'No step layout available for this scenario.',
  },
  buttons: {
    back: 'Back',
    nextPreview: 'Next preview',
    resetPath: 'Reset path',
    allSteps: 'All steps',
    showAllSteps: 'Show all steps',
    copySectionKey: 'Copy section key',
    copyDomainKey: 'Copy domain key',
    copyId: 'Copy id',
    copyListForVerification: 'Copy list for verification',
  },
} as const;

