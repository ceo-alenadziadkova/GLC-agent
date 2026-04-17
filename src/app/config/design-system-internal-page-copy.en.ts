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
  docLinks: {
    current: 'docs/design-system/current.md',
    roadmap: 'docs/design-system/roadmap-notes.md',
    inventory: 'docs/design-system/inventory-dump.md',
    violations: 'docs/design-system/violations-export.md',
    tokenMatrix: 'docs/design-system/token-replacement-matrix.md',
  },
} as const;
