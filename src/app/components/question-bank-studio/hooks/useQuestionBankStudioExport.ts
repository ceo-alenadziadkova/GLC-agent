import { useCallback, useState } from 'react';

import { QUESTION_BANK_VERSION } from '@glc/intake-core';

import { buildStudioMapSvg, downloadDataUrl, studioSvgToPngDataUrl } from '../../../lib/question-bank-studio-map-export';

import type { StudioAnyNodeData } from '../../../lib/question-bank-studio-graph';
import type { Edge, Node } from '@xyflow/react';

type UseQuestionBankStudioExportInput = {
  layoutNodes: readonly Node<StudioAnyNodeData>[];
  layoutEdges: readonly Edge[];
  isDark: boolean;
  effectiveShowBranchEdges: boolean;
};

export function useQuestionBankStudioExport(input: UseQuestionBankStudioExportInput): {
  exportBusy: boolean;
  downloadSvgExport: () => void;
  downloadPngExport: () => Promise<void>;
} {
  const { layoutNodes, layoutEdges, isDark, effectiveShowBranchEdges } = input;

  const [exportBusy, setExportBusy] = useState(false);

  const downloadSvgExport = useCallback(() => {
    const svg = buildStudioMapSvg(layoutNodes, layoutEdges, {
      title: `Question Bank Studio · v${QUESTION_BANK_VERSION}`,
      theme: isDark ? 'dark' : 'light',
      includeBranchEdges: effectiveShowBranchEdges,
    });

    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `question-bank-studio-v${QUESTION_BANK_VERSION}.svg`;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [layoutNodes, layoutEdges, isDark, effectiveShowBranchEdges]);

  const downloadPngExport = useCallback(async () => {
    setExportBusy(true);
    try {
      const svg = buildStudioMapSvg(layoutNodes, layoutEdges, {
        title: `Question Bank Studio · v${QUESTION_BANK_VERSION}`,
        theme: isDark ? 'dark' : 'light',
        includeBranchEdges: effectiveShowBranchEdges,
      });
      const png = await studioSvgToPngDataUrl(svg, 2);
      downloadDataUrl(png, `question-bank-studio-v${QUESTION_BANK_VERSION}.png`);
    } finally {
      setExportBusy(false);
    }
  }, [layoutNodes, layoutEdges, isDark, effectiveShowBranchEdges]);

  return { exportBusy, downloadSvgExport, downloadPngExport };
}

