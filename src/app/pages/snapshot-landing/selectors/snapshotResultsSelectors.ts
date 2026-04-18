import type { FreeSnapshotPreview } from '../../../data/auditTypes';
import { SNAPSHOT_LANDING_HERO_COPY } from '../../../config/snapshot-landing-copy.en';
import { scoreColorFrom100 } from '../../../lib/snapshot-landing-helpers';

export type CategoryScoreRow = {
  label: string;
  key: 'ux_clarity' | 'conversion_readiness' | 'ai_readiness' | 'technical_basics';
  value: number;
  percentage: number;
  barColor: string;
};

export function createCategoryScoreRows(result: FreeSnapshotPreview): CategoryScoreRow[] {
  if (!result.category_scores) return [];
  const source = [
    [SNAPSHOT_LANDING_HERO_COPY.categoryLabels.uxClarity, 'ux_clarity', result.category_scores.ux_clarity],
    [
      SNAPSHOT_LANDING_HERO_COPY.categoryLabels.conversionReadiness,
      'conversion_readiness',
      result.category_scores.conversion_readiness,
    ],
    [SNAPSHOT_LANDING_HERO_COPY.categoryLabels.aiReadiness, 'ai_readiness', result.category_scores.ai_readiness],
    [
      SNAPSHOT_LANDING_HERO_COPY.categoryLabels.technicalBasics,
      'technical_basics',
      result.category_scores.technical_basics,
    ],
  ] as const;

  return source.map(([label, key, rawValue]) => {
    const value = rawValue as number;
    return {
      label,
      key,
      value,
      percentage: Math.max(0, Math.min(100, value)),
      barColor: scoreColorFrom100(value),
    };
  });
}

export function flattenDetectedTech(techEntries: Array<[string, string[]]>): string[] {
  return techEntries.flatMap(([, values]) => values);
}
