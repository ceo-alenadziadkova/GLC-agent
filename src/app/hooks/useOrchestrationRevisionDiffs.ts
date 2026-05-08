import { useEffect, useMemo, useState } from 'react';

import type {
  GlcOrchestrationPackRevisionDiffView,
} from '../data/audit/contracts/report/orchestration-pack.types';
import type { OrchestrationPackRevisionHistoryItemDto } from '../data/api/orchestration-types';
import { api } from '../data/apiService';
import { ORCHESTRATION_UI_LIMITS } from '../config/orchestration-ui-limits';

type LastPostRevision = {
  roadmap_version: number;
  diff: GlcOrchestrationPackRevisionDiffView | null;
};

type UseOrchestrationRevisionDiffsOptions = {
  auditId: string;
  orchestrationPackVersion: number | null | undefined;
  strategyLastRevisionDiff: GlcOrchestrationPackRevisionDiffView | null | undefined;
};

export function useOrchestrationRevisionDiffs({
  auditId,
  orchestrationPackVersion,
  strategyLastRevisionDiff,
}: UseOrchestrationRevisionDiffsOptions) {
  const [lastPostRevision, setLastPostRevision] = useState<LastPostRevision | null>(null);
  const [revisionHistory, setRevisionHistory] = useState<OrchestrationPackRevisionHistoryItemDto[]>([]);
  const [selectedRevisionDiffKey, setSelectedRevisionDiffKey] = useState<string | null>(null);

  useEffect(() => {
    if (
      lastPostRevision &&
      typeof orchestrationPackVersion === 'number' &&
      orchestrationPackVersion === lastPostRevision.roadmap_version
    ) {
      setLastPostRevision(null);
    }
  }, [orchestrationPackVersion, lastPostRevision]);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    void (async () => {
      try {
        const { items } = await api.getOrchestrationPackDiffHistory(auditId, {
          limit: ORCHESTRATION_UI_LIMITS.maxRevisionDiffHistoryItems,
          signal,
        });
        if (signal.aborted) return;
        setRevisionHistory(items);
        if (items.length > 0) {
          const firstKey = `${items[0].from_version}:${items[0].to_version}`;
          setSelectedRevisionDiffKey(prev => prev ?? firstKey);
        }
      } catch {
        if (signal.aborted) return;
        setRevisionHistory([]);
      }
    })();
    return () => {
      controller.abort();
    };
  }, [auditId, orchestrationPackVersion]);

  const revisionDiffToShow = lastPostRevision?.diff ?? strategyLastRevisionDiff ?? null;

  const revisionDiffCandidates = useMemo(() => {
    const items = revisionHistory.map(row => ({
      key: `${row.from_version}:${row.to_version}`,
      from_version: row.from_version,
      to_version: row.to_version,
      diff: row.diff,
    }));
    if (lastPostRevision?.diff) {
      const key = `${lastPostRevision.diff.from_version}:${lastPostRevision.diff.to_version}`;
      if (!items.some(item => item.key === key)) {
        items.unshift({
          key,
          from_version: lastPostRevision.diff.from_version,
          to_version: lastPostRevision.diff.to_version,
          diff: lastPostRevision.diff,
        });
      }
    }
    return items;
  }, [revisionHistory, lastPostRevision]);

  const selectedRevisionDiff =
    revisionDiffCandidates.find(item => item.key === selectedRevisionDiffKey)?.diff ?? revisionDiffToShow;

  const roadmapVersionToShow =
    typeof orchestrationPackVersion === 'number' && orchestrationPackVersion > 0
      ? orchestrationPackVersion
      : lastPostRevision?.roadmap_version ?? 0;

  return {
    lastPostRevision,
    setLastPostRevision,
    revisionHistory,
    selectedRevisionDiffKey,
    setSelectedRevisionDiffKey,
    revisionDiffCandidates,
    selectedRevisionDiff,
    roadmapVersionToShow,
  };
}
