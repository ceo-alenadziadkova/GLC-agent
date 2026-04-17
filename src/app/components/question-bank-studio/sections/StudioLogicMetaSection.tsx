type StudioLogicMetaSectionProps = {
  sectionKeys: string[];
  collapsedSections: Set<string>;
  stats: {
    questionCount: number;
    sectionCount: number;
    structureEdgeCount: number;
    structureMaxDepth: number;
    structureLeafCount: number;
    branchEdgeCount: number;
    branchMaxDepth: number;
    branchRootCount: number;
    branchLeafCount: number;
  };
  search: string;
  debouncedSearch: string;
  centerOnNodeId: string | null;
  onToggleSection: (key: string) => void;
  onSearchChange: (next: string) => void;
};

export function StudioLogicMetaSection(props: StudioLogicMetaSectionProps) {
  const {
    sectionKeys,
    collapsedSections,
    stats,
    search,
    debouncedSearch,
    centerOnNodeId,
    onToggleSection,
    onSearchChange,
  } = props;

  return (
    <>
      <div className="rounded-lg px-3 py-2" style={{ backgroundColor: 'var(--bg-canvas)', border: '1px solid var(--border-default)' }}>
        <div className="text-[length:var(--text-2xs)] font-semibold uppercase mb-2" style={{ color: 'var(--text-tertiary)' }}>
          Collapse sections
        </div>
        <div className="flex flex-wrap gap-1.5">
          {sectionKeys.map(key => {
            const on = collapsedSections.has(key);
            return (
              <button
                key={key}
                type="button"
                className="text-[length:var(--text-2xs)] font-medium px-2 py-1 rounded-md"
                style={{
                  border: on ? '1px solid var(--glc-orange)' : '1px solid var(--border-default)',
                  backgroundColor: on ? 'var(--glc-orange-muted)' : 'var(--bg-surface)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
                onClick={() => onToggleSection(key)}
              >
                {on ? `+ ${key}` : `− ${key}`}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
        <span>Questions: {stats.questionCount}</span>
        <span>Sections: {stats.sectionCount}</span>
        <span>Structure edges: {stats.structureEdgeCount}</span>
        <span>Structure depth: {stats.structureMaxDepth}</span>
        <span>Structure leaves: {stats.structureLeafCount}</span>
        <span>Branch edges (graph): {stats.branchEdgeCount}</span>
        <span>Branch depth: {stats.branchMaxDepth}</span>
        <span>Branch roots: {stats.branchRootCount}</span>
        <span>Branch leaves: {stats.branchLeafCount}</span>
      </div>

      <div className="flex flex-col gap-1 max-w-md">
        <input
          type="search"
          placeholder="Search by id/label/section/domain"
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          className="w-full px-3 py-2 text-xs rounded-md"
          style={{ backgroundColor: 'var(--bg-canvas)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
        />
        {debouncedSearch.length > 0 ? (
          <span className="text-[length:var(--text-2xs)]" style={{ color: 'var(--text-quaternary)' }}>
            {centerOnNodeId ? 'Centered on first match.' : 'No match in visible graph.'}
          </span>
        ) : null}
      </div>
    </>
  );
}
