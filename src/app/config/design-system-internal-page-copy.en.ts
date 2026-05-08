/**
 * Internal-only page copy (consultant role). English for consistency with other admin copy modules.
 */
export const DESIGN_SYSTEM_INTERNAL_PAGE_COPY = {
  title: 'Design system (internal)',
  subtitle: 'GLC staff: canonical layers, enforcement commands, and where drift / hardcoded visuals still live.',
  intro:
    'Clients never see this route. Use the JSON manifest (page footer) for LLM or script ingestion. Canonical narrative spec lives in the repo under docs/design-system/.',
  sections: {
    spec: { heading: 'Documentation (repo)', body: 'Human-readable as-is spec and governance notes live next to the code; regenerate drift appendices with the commands below.' },
    tokens: { heading: 'Tokens and CSS', body: 'Runtime visual SSOT is CSS custom properties; TypeScript maps re-export var(--*) references for components.' },
    components: { heading: 'Primitives and patterns', body: 'Product UI should compose primitives from the design-system package; patterns stay layout-only in TS and delegate visuals to .ds-pattern-* bridges.' },
    enforcement: { heading: 'What CI enforces', body: 'Merge gate runs strict runtime audits (no baseline grandfather). Migration reports show broader drift including allowlisted legacy.' },
    hardcode: { heading: 'Known hardcode / drift buckets', body: 'These areas are documented as exceptions or ongoing migration targets — not a license to add new raw visuals elsewhere.' },
  },
  machineBlockTitle: 'Machine-readable manifest (JSON)',
  machineBlockHint: 'Copy the block below or read script#glc-design-system-internal-manifest in the DOM.',
  tabs: {
    overview: 'Overview',
    foundation: 'Foundation',
    primitives: 'Primitives',
    patterns: 'Patterns',
    tooling: 'Tooling',
    machine: 'Manifest',
  },
  foundation: {
    colorsIntro: 'Swatches use SSOT variables only (values from COLOR_TOKENS → var(--*)).',
    typographyIntro: 'Scale from TYPOGRAPHY_TOKENS.fontSize; sans family and relaxed line height from tokens.',
    spacingIntro: 'Bar width follows SPACING_TOKENS; height is fixed for comparison.',
    radiusIntro: 'Tiles use RADIUS_TOKENS on border-radius only; fill is elevated surface.',
    shadowsIntro: 'Tiles apply SHADOW_TOKENS via box-shadow on a neutral card shell.',
  },
  primitives: {
    intro: 'Vendor-style primitives in src/app/components/ui — same API as the rest of the product.',
    buttons: 'Button variants',
    badges: 'Badge variants',
    inputs: 'Input',
    callouts: 'Callout intents',
  },
  patterns: {
    intro:
      'Layout composition contracts from src/design-system/patterns — Tailwind layout utilities and .ds-pattern-* bridges only (audit:ds:patterns-lock). Below: source strings plus a live sandbox.',
    layout: {
      heading: 'LAYOUT_CONTRACTS',
      body: 'Canonical page width caps and vertical rhythm helpers used across marketing and product shells.',
    },
    pageShell: {
      heading: 'PAGE_SHELL_CONTRACTS',
      body: 'Max-width shell, token-backed body padding (.ds-pattern-page-shell-body), and stacked section spacing.',
    },
    sectionShell: {
      heading: 'SECTION_SHELL_CONTRACTS',
      body: 'Section chrome: root uses .ds-pattern-section-shell-root; heading row + stacked content spacing.',
    },
    cardGrid: {
      heading: 'CARD_GRID_CONTRACTS',
      body: 'Responsive grids for card-heavy surfaces (1 → 2 → 3 columns at breakpoints).',
    },
    formSection: {
      heading: 'FORM_SECTION_CONTRACTS',
      body: 'Form stack: root uses .ds-pattern-form-section-root; single-column field grid and right-aligned actions.',
    },
    headerActions: {
      heading: 'HEADER_ACTIONS_CONTRACTS',
      body: 'Page header row: title block (min-w-0) + trailing actions with wrap.',
    },
    reportViewer: {
      heading: 'REPORT_VIEWER_LAYOUT',
      body: 'Report viewer findings grid — composition only; card visuals use .ds-report-* in src/styles/components/*.css.',
    },
    sandboxLabel: 'Live preview',
    codeLabel: 'Exported class strings',
  },
  docLinks: {
    current: 'docs/design-system/current.md',
    roadmap: 'docs/design-system/roadmap-notes.md',
    inventory: 'docs/design-system/inventory-dump.md',
    violations: 'docs/design-system/violations-export.md',
    tokenMatrix: 'docs/design-system/token-replacement-matrix.md',
  },
} as const;
