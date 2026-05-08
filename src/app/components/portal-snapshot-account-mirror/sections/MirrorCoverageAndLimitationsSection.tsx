export function MirrorCoverageAndLimitationsSection({
  coverageLine,
  showCallout,
  limitations,
}: {
  coverageLine: string | null;
  showCallout: boolean;
  limitations: string[];
}) {
  return (
    <>
      {coverageLine ? (
        <p className="px-1 text-center text-xs text-[var(--text-quaternary)] lg:px-0 lg:text-left">
          {coverageLine}
        </p>
      ) : null}
      {!showCallout && limitations.length > 0 ? (
        <div className="ds-snapshot-limitations mx-auto max-w-lg lg:mx-0 lg:max-w-none">
          <ul className="list-disc space-y-1.5 pl-4 text-left text-xs text-[var(--callout-warning-fg)]">
            {limitations.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}
