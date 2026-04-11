/**
 * English copy embedded in free-snapshot upgrade prefill payloads (consultant-facing hints).
 */

export const UPGRADE_FREE_SNAPSHOT_COPY_EN = {
  snapshotScrapeNoteRobotsBlocked:
    'Free snapshot did not fetch HTML (robots.txt blocks or policy). Pre-fill from pages is minimal — prioritize the client brief.',
  snapshotScrapeNoteOther:
    'Free snapshot did not fetch public HTML (timeout, error, or empty response). Pre-fill from pages is minimal — prioritize the client brief.',
} as const;
