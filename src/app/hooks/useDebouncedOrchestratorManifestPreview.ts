import { useEffect, useState } from 'react';

import { ORCHESTRATION_UI_LIMITS } from '../config/orchestration-ui-limits';
import { ORCHESTRATION_UI_COPY } from '../config/orchestration-roadmap-ui-copy.en';
import { ApiError } from '../data/api-error';
import { api } from '../data/apiService';
import type { RoadmapManifestPreviewDto, RoadmapManifestRequestBody } from '../data/api/audits-orchestration';

/**
 * Debounced manifest preview (POST orchestrator preview) with AbortController for strict cleanup.
 * Shared by Strategy Lab orchestration panel and portal manifest wizard.
 */
export function useDebouncedOrchestratorManifestPreview(args: {
  auditId: string | undefined;
  body: RoadmapManifestRequestBody | null;
  enabled: boolean;
}): {
  manifestPreview: RoadmapManifestPreviewDto | null;
  manifestPreviewError: string | null;
  previewLoading: boolean;
} {
  const [manifestPreview, setManifestPreview] = useState<RoadmapManifestPreviewDto | null>(null);
  const [manifestPreviewError, setManifestPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    if (!args.enabled || !args.auditId || !args.body) {
      setManifestPreview(null);
      setManifestPreviewError(null);
      setPreviewLoading(false);
      return;
    }

    const controller = new AbortController();
    setManifestPreviewError(null);
    setPreviewLoading(false);

    const timerId = window.setTimeout(() => {
      if (controller.signal.aborted) return;
      setManifestPreviewError(null);
      setPreviewLoading(true);
      void (async () => {
        try {
          const { preview } = await api.postOrchestratorPreview(args.auditId!, args.body!, {
            signal: controller.signal,
          });
          if (controller.signal.aborted) return;
          setManifestPreview(preview);
          setManifestPreviewError(null);
        } catch (e) {
          if (controller.signal.aborted) return;
          setManifestPreview(null);
          const detail =
            e instanceof ApiError && e.details && typeof e.details === 'object' && e.details !== null && 'detail' in e.details
              ? String((e.details as { detail?: unknown }).detail ?? '')
              : '';
          setManifestPreviewError(detail || ORCHESTRATION_UI_COPY.previewFailed);
        } finally {
          if (!controller.signal.aborted) {
            setPreviewLoading(false);
          }
        }
      })();
    }, ORCHESTRATION_UI_LIMITS.manifestPreviewDebounceMs);

    return () => {
      controller.abort();
      window.clearTimeout(timerId);
    };
  }, [args.auditId, args.body, args.enabled]);

  return { manifestPreview, manifestPreviewError, previewLoading };
}
