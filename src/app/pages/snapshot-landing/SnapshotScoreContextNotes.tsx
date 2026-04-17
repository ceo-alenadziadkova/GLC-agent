import type { FreeSnapshotPreview } from '../../data/auditTypes';
import { scanConfidenceExplanation, snapshotZeroPagesScoreNote } from '../../lib/snapshot-diagnostics';
import { fivePointBandExplanation, legacyUxBand } from '../../lib/snapshot-landing-helpers';

export function SnapshotScoreContextNotes(props: {
  result: FreeSnapshotPreview;
  /** When true, a top divider separates this block from copy above (e.g. API summary). */
  showTopDivider?: boolean;
}) {
  const { result, showTopDivider = true } = props;
  const has100 = typeof result.overall_score === 'number';
  const band = legacyUxBand(result.ux_score);
  const scan = result.scan_confidence_band;
  const zeroPagesNote = snapshotZeroPagesScoreNote(result);

  return (
    <div
      className={
        showTopDivider
          ? 'mt-5 border-t border-[var(--border-subtle)] pt-4'
          : 'mt-3 text-left sm:mt-4'
      }
    >
      <p
        className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]"
      >
        What these numbers mean
      </p>
      <div className="space-y-3">
        {zeroPagesNote ? (
          <p className="text-sm font-medium leading-relaxed text-[var(--text-secondary)]">
            {zeroPagesNote}
          </p>
        ) : null}
        <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
          {has100
            ? fivePointBandExplanation({ band, uxLabel: result.ux_label, hasOverall100: true })
            : fivePointBandExplanation({ band, uxLabel: result.ux_label, hasOverall100: false })}
        </p>
        {scan && (
          <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
            {scanConfidenceExplanation(scan)}
          </p>
        )}
      </div>
    </div>
  );
}
