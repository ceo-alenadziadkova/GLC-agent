import { API_PATHS } from '../../config/api-paths';
import type { FreeSnapshotPreview } from '../auditTypes';
import { apiFetch } from '../api-http';

type SnapshotCompareResponse = {
  competitor_mini: FreeSnapshotPreview['competitor_mini'] | null;
};

export const snapshotCompareApi = {
  compareSnapshotSites(selfUrl: string, competitorUrl: string): Promise<SnapshotCompareResponse> {
    return apiFetch<SnapshotCompareResponse>(`${API_PATHS.snapshot}/compare`, {
      method: 'POST',
      body: JSON.stringify({
        self_url: selfUrl,
        competitor_url: competitorUrl,
      }),
    });
  },
};
