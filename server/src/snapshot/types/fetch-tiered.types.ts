import type { SnapshotScanCoverage } from '../types.js';

export type RobotsHeadProbeShape = NonNullable<SnapshotScanCoverage['robotsHeadProbe']>;

export type HomeFetchFailureReason =
  | 'network_or_timeout'
  | 'http_error'
  | 'non_html'
  | 'empty_body';

export type HeadProbeResult = {
  status: number;
  contentType?: string;
  finalUrl?: string;
  xRobotsTag?: string;
  uaUsed: 'glc_scanner' | 'browser_compat';
};
