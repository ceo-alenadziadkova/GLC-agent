import { useState } from 'react';

import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { ORCHESTRATION_UI_COPY } from '../../config/orchestration-roadmap-ui-copy.en';
import type { RoadmapManifestRequestBody, RoadmapManifestPreviewDto } from '../../data/api/orchestration-types';
import { api } from '../../data/apiService';
import { compareRoadmapManifestPreviews } from '../../lib/scenario-compare';
import { logger } from '../../lib/logger';

type Pair = { a: RoadmapManifestPreviewDto; b: RoadmapManifestPreviewDto };

/**
 * What-if: dual manifest preview + diff (v9). Used from consultant cockpit and portal manifest wizard.
 */
export function ManifestScenarioCompareCta({
  auditId,
  basePayload,
}: {
  auditId: string;
  basePayload: RoadmapManifestRequestBody;
}) {
  const [openPair, setOpenPair] = useState<Pair | null>(null);
  const [loading, setLoading] = useState(false);
  const load = async () => {
    setLoading(true);
    try {
      const alt: RoadmapManifestRequestBody = {
        ...basePayload,
        change_scenario: basePayload.change_scenario === 'accelerate' ? 'conservative' : 'accelerate',
      };
      const [ra, rb] = await Promise.all([
        api.postRoadmapManifestPreview(auditId, basePayload),
        api.postRoadmapManifestPreview(auditId, alt),
      ]);
      setOpenPair({ a: ra.preview, b: rb.preview });
      logger.info('orchestration.scenario_compare.opened', { auditId });
    } finally {
      setLoading(false);
    }
  };
  const diff = openPair ? compareRoadmapManifestPreviews(openPair.a, openPair.b) : null;
  return (
    <>
      <Button type="button" size="sm" variant="outline" disabled={loading} onClick={() => void load()}>
        {loading ? '…' : ORCHESTRATION_UI_COPY.scenarioCompareCta}
      </Button>
      <Dialog
        open={openPair != null}
        onOpenChange={o => {
          if (!o) {
            setOpenPair(null);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{ORCHESTRATION_UI_COPY.scenarioCompareTitle}</DialogTitle>
          </DialogHeader>
          {diff && openPair ? (
            <>
              <p className="text-sm ds-text-secondary">{diff.summary}</p>
              <ul className="mt-3 list-inside list-disc text-xs ds-text-tertiary">
                <li>Lanes A: {openPair.a.lanes_included.join(', ') || '—'}</li>
                <li>Lanes B: {openPair.b.lanes_included.join(', ') || '—'}</li>
              </ul>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
