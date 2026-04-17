/**
 * Static vector export of the studio structure graph (for Slack/docs).
 * Uses the same layout positions as React Flow nodes (top-left origin).
 */
import type { Edge, Node } from '@xyflow/react';
import type { StudioAnyNodeData } from './question-bank-studio-graph';

export type StudioMapExportTheme = 'light' | 'dark';

/** Resolve design token at runtime (requires `tokens.css` on document; tests load it in setup). */
function cssVar(name: string): string {
  if (typeof document === 'undefined') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const TYPE_DIM: Record<string, { w: number; h: number }> = {
  studioRoot: { w: 200, h: 40 },
  studioSection: { w: 220, h: 44 },
  studioLayoutStep: { w: 210, h: 48 },
  studioQuestion: { w: 260, h: 76 },
  studioIdentity: { w: 240, h: 52 },
  studioDomainCluster: { w: 220, h: 44 },
};

function dimForNodeType(t: string | undefined): { w: number; h: number } {
  return TYPE_DIM[t ?? ''] ?? { w: 200, h: 40 };
}

function dimForNode(n: Node<StudioAnyNodeData>): { w: number; h: number } {
  if (n.type === 'studioQuestion' && n.data.kind === 'question') {
    return n.data.layoutSize;
  }
  return dimForNodeType(n.type);
}

function labelLinesForData(d: StudioAnyNodeData): string[] {
  switch (d.kind) {
    case 'root':
      return [d.label];
    case 'section':
      return [d.label];
    case 'layoutStep':
      return [`${d.label}`, `${d.surfaceKey}`];
    case 'question':
      return [d.questionId, d.shortLabel];
    case 'identity':
      return [d.questionId];
    case 'domainCluster':
      return [d.label];
    default:
      return [''];
  }
}

function themePalette(theme: StudioMapExportTheme) {
  if (theme === 'dark') {
    return {
      bg: cssVar('--studio-map-export-dark-bg'),
      structureStroke: cssVar('--studio-map-export-dark-structure-stroke'),
      branchStroke: cssVar('--studio-map-export-dark-branch-stroke'),
      text: cssVar('--studio-map-export-dark-text'),
      subtext: cssVar('--studio-map-export-dark-subtext'),
    };
  }
  return {
    bg: cssVar('--studio-map-export-light-bg'),
    structureStroke: cssVar('--studio-map-export-light-structure-stroke'),
    branchStroke: cssVar('--studio-map-export-light-branch-stroke'),
    text: cssVar('--studio-map-export-light-text'),
    subtext: cssVar('--studio-map-export-light-subtext'),
  };
}

/** Straight edges between node centers (good enough for discussion snapshots). */
export function buildStudioMapSvg(
  nodes: readonly Node<StudioAnyNodeData>[],
  edges: readonly Edge[],
  options?: {
    theme?: StudioMapExportTheme;
    title?: string;
    /** Skip branch edges (blue dashed in UI) when false. Default true. */
    includeBranchEdges?: boolean;
  },
): string {
  const theme = options?.theme ?? 'light';
  const pal = themePalette(theme);
  const includeBranch = options?.includeBranchEdges !== false;

  const visibleNodes = nodes.filter(n => !n.hidden);
  const nodeById = new Map(visibleNodes.map(n => [n.id, n]));

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of visibleNodes) {
    const { w, h } = dimForNode(n);
    minX = Math.min(minX, n.position.x);
    minY = Math.min(minY, n.position.y);
    maxX = Math.max(maxX, n.position.x + w);
    maxY = Math.max(maxY, n.position.y + h);
  }
  if (!Number.isFinite(minX)) {
    minX = 0;
    minY = 0;
    maxX = 400;
    maxY = 200;
  }

  const pad = 32;
  const titleH = options?.title ? 28 : 0;
  const ox = pad - minX;
  const oy = pad - minY + titleH;
  const w = Math.ceil(maxX - minX + pad * 2);
  const h = Math.ceil(maxY - minY + pad * 2 + titleH);

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`,
  );
  parts.push(`<rect x="0" y="0" width="${w}" height="${h}" fill="${pal.bg}"/>`);
  if (options?.title) {
    parts.push(
      `<text x="${pad}" y="20" fill="${pal.text}" font-size="14" font-weight="600" font-family="system-ui,sans-serif">${escapeXml(options.title)}</text>`,
    );
  }

  const edgeList = includeBranch
    ? edges.filter(e => !nodeHiddenEnds(e, nodeById))
    : edges.filter(e => !String(e.id).startsWith('e-branch-') && !nodeHiddenEnds(e, nodeById));

  for (const e of edgeList) {
    const s = nodeById.get(e.source);
    const t = nodeById.get(e.target);
    if (!s || !t) continue;
    const ds = dimForNode(s);
    const dt = dimForNode(t);
    const x1 = s.position.x + ox + ds.w / 2;
    const y1 = s.position.y + oy + ds.h / 2;
    const x2 = t.position.x + ox + dt.w / 2;
    const y2 = t.position.y + oy + dt.h / 2;
    const isBranch = String(e.id).startsWith('e-branch-');
    const stroke = isBranch ? pal.branchStroke : pal.structureStroke;
    const dash = isBranch ? ' stroke-dasharray="6 4"' : '';
    parts.push(
      `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${stroke}" stroke-width="${isBranch ? 1.2 : 1}"${dash}/>`,
    );
  }

  for (const n of visibleNodes) {
    const { w: nw, h: nh } = dimForNode(n);
    const x = n.position.x + ox;
    const y = n.position.y + oy;
    const fill =
      n.type === 'studioSection'
        ? cssVar('--studio-map-node-fill-section')
        : n.type === 'studioDomainCluster'
          ? cssVar('--studio-map-node-fill-domain-cluster')
          : n.type === 'studioLayoutStep'
            ? cssVar('--studio-map-node-fill-layout-step')
            : n.type === 'studioIdentity'
              ? cssVar('--studio-map-node-fill-identity')
              : theme === 'dark'
                ? cssVar('--studio-map-node-fill-question-dark')
                : cssVar('--studio-map-node-fill-question-light');
    const stroke =
      n.type === 'studioSection'
        ? pal.branchStroke
        : n.type === 'studioDomainCluster'
          ? cssVar('--studio-map-node-stroke-domain-cluster')
          : n.type === 'studioLayoutStep'
            ? cssVar('--studio-map-node-stroke-layout-step')
            : n.type === 'studioIdentity'
              ? cssVar('--studio-map-node-stroke-identity')
              : pal.structureStroke;
    const strokeW = n.type === 'studioQuestion' ? 1 : 1.2;
    const dash =
      n.type === 'studioLayoutStep' || n.type === 'studioIdentity' ? ' stroke-dasharray="4 3"' : '';
    parts.push(
      `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${nw}" height="${nh}" rx="8" fill="${fill}" stroke="${stroke}" stroke-width="${strokeW}"${dash}/>`,
    );
    const lines = labelLinesForData(n.data);
    const fs = n.type === 'studioQuestion' ? 11 : 10;
    let ty = y + (n.type === 'studioQuestion' ? 18 : 16);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? '';
      if (!line && i > 0) continue;
      const weight = i === 0 ? '600' : '400';
      const fillT = i === 0 ? pal.text : pal.subtext;
      const clip =
        line.length > 42 && n.type === 'studioQuestion' && i === 1
          ? `${escapeXml(line.slice(0, 41))}…`
          : escapeXml(line);
      parts.push(
        `<text x="${(x + 8).toFixed(1)}" y="${ty}" fill="${fillT}" font-size="${fs - (i > 0 ? 1 : 0)}" font-weight="${weight}" font-family="ui-monospace,monospace,sans-serif">${clip}</text>`,
      );
      ty += i === 0 ? 14 : 12;
    }
  }

  parts.push(`</svg>`);
  return parts.join('');
}

function nodeHiddenEnds(e: Edge, nodeById: Map<string, Node<StudioAnyNodeData>>): boolean {
  return !nodeById.has(e.source) || !nodeById.has(e.target);
}

/** Convert SVG XML to PNG data URL (browser only). */
export async function studioSvgToPngDataUrl(svgXml: string, scale = 2): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const blob = new Blob([svgXml], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.floor(img.width * scale));
        canvas.height = Math.max(1, Math.floor(img.height * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas unsupported'));
          return;
        }
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/png'));
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to rasterize SVG'));
    };
    img.src = url;
  });
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
}
