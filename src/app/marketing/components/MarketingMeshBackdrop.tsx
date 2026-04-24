/**
 * Fixed spatial mesh background for public marketing pages (no raw style literals in TSX).
 */
export function MarketingMeshBackdrop() {
  return (
    <div className="ds-marketing-mesh-backdrop" aria-hidden>
      <div className="ds-marketing-mesh-blobs-wrap">
        <span className="ds-marketing-mesh-blob ds-marketing-mesh-blob--tl" />
        <span className="ds-marketing-mesh-blob ds-marketing-mesh-blob--br" />
        <span className="ds-marketing-mesh-blob ds-marketing-mesh-blob--c" />
      </div>
    </div>
  );
}
