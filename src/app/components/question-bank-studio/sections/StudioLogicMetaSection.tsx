import { cn } from '../../ui/utils';
import { Input } from '../../ui/input';

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
      <div className="rounded-lg px-3 py-2 ds-panel-canvas" >
        <div className="text-[length:var(--text-2xs)] font-semibold uppercase mb-2 ds-text-tertiary" >
          Collapse sections
        </div>
        <div className="flex flex-wrap gap-1.5">
          {sectionKeys.map(key => {
            const on = collapsedSections.has(key);
            return (
              <button
                key={key}
                type="button"
                className={cn(
                  'text-[length:var(--text-2xs)] font-medium px-2 py-1 rounded-md ds-qb-studio-section-toggle',
                  on && 'ds-qb-studio-section-toggle--collapsed',
                )}
                onClick={() => onToggleSection(key)}
              >
                {on ? `+ ${key}` : `− ${key}`}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs ds-text-tertiary" >
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
        <Input
          type="search"
          placeholder="Search by id/label/section/domain"
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          className="ds-panel-canvas-primary h-auto w-full min-h-7 px-3 py-2 text-xs"
        />
        {debouncedSearch.length > 0 ? (
          <span className="text-[length:var(--text-2xs)] ds-text-quaternary" >
            {centerOnNodeId ? 'Centered on first match.' : 'No match in visible graph.'}
          </span>
        ) : null}
      </div>
    </>
  );
}
