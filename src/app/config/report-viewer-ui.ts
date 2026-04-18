import type { ReportProfile } from '@glc/intake-core';

export const REPORT_VIEWER_UI = {
  easing: [0.16, 1, 0.3, 1] as const,
  profileMaxItems: {
    full: 999,
    owner: 5,
    tech: 999,
    marketing: 999,
    onepager: 3,
  } as const satisfies Record<ReportProfile, number>,
  motion: {
    staggerChildrenSec: 0.06,
    itemEnterDurationSec: 0.3,
    itemEnterOffsetY: 10,
  },
} as const;
