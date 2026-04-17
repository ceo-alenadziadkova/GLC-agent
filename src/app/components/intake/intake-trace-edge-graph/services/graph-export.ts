import { INTAKE_TRACE_GRAPH_CONFIG } from '../config/graph-config';
import type { WordingReviewItem, WordingScoringMode } from '../types';

interface ExportWordingReviewPayload {
  items: WordingReviewItem[];
  averageWordingScore: number;
  highOnly: boolean;
  scoringMode: WordingScoringMode;
  resolveLabel: (id: string) => string;
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function exportGraphSvg(svg: SVGSVGElement, focusId: string): void {
  const serializer = new XMLSerializer();
  const source = serializer.serializeToString(svg);
  const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
  const normalizedFocus = focusId || 'all';
  const filename = `${INTAKE_TRACE_GRAPH_CONFIG.export.svgNamePrefix}-${normalizedFocus}.svg`;
  triggerDownload(blob, filename);
}

export function exportWordingReviewMarkdown(payload: ExportWordingReviewPayload): void {
  const lines: string[] = [];
  lines.push('# Intake wording BA review');
  lines.push('');
  lines.push(`- Generated at: ${new Date().toISOString()}`);
  lines.push(`- Items: ${payload.items.length}`);
  lines.push(`- Average quality score: ${payload.averageWordingScore}/100`);
  lines.push(`- Filter: ${payload.highOnly ? 'high severity only' : 'all severities'}`);
  lines.push(`- Scoring mode: ${payload.scoringMode}`);
  lines.push('');
  lines.push('## Findings');
  lines.push('');

  if (payload.items.length === 0) {
    lines.push('No findings for the current filter.');
  } else {
    for (const item of payload.items) {
      lines.push(`### ${item.id}`);
      lines.push(`- Link: [Focus ${item.id}](#${item.id})`);
      lines.push(`- Severity: ${item.severity}`);
      lines.push(`- Quality score: ${item.score}/100`);
      lines.push(`- Label: ${payload.resolveLabel(item.id)}`);
      lines.push('- Reasons:');
      for (const reason of item.reasons) lines.push(`  - ${reason}`);
      lines.push('');
    }
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
  triggerDownload(blob, INTAKE_TRACE_GRAPH_CONFIG.export.markdownFilename);
}

