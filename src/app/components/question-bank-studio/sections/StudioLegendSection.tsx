import type { CSSProperties } from 'react';

import { QUESTION_BANK_STUDIO_COPY_EN } from '../../../config/question-bank-studio-copy.en';

type StudioLegendSectionProps = {
  legendStyle: CSSProperties;
  markerSizePx: number;
  domainBorderColor: string;
  layoutBorderColor: string;
  planFootprintSize: number | null;
};

export function StudioLegendSection(props: StudioLegendSectionProps) {
  const { legendStyle, markerSizePx, domainBorderColor, layoutBorderColor, planFootprintSize } = props;

  return (
    <div className="rounded-lg px-3 py-2" style={{ backgroundColor: 'var(--bg-canvas)', border: '1px solid var(--border-default)' }}>
      <div className="text-[length:var(--text-2xs)] font-semibold uppercase mb-1" style={{ color: 'var(--text-tertiary)' }}>
        {QUESTION_BANK_STUDIO_COPY_EN.legend.title}
      </div>
      <div className="grid gap-1.5 mobile:grid-cols-2" style={legendStyle}>
        <span className="flex items-center gap-2">
          <span className="inline-block rounded-sm shrink-0" style={{ width: markerSizePx, height: markerSizePx, backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }} />
          Root
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block rounded-sm shrink-0" style={{ width: markerSizePx, height: markerSizePx, backgroundColor: 'var(--glc-blue-muted)', border: '1px solid var(--glc-blue)' }} />
          Section (schema)
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block rounded-sm shrink-0" style={{ width: markerSizePx, height: markerSizePx, backgroundColor: 'var(--bg-surface)', border: `1px dashed ${domainBorderColor}` }} />
          Domain group (primary feed)
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block rounded-sm shrink-0" style={{ width: markerSizePx, height: markerSizePx, backgroundColor: 'var(--bg-surface)', border: `1px dashed ${layoutBorderColor}` }} />
          Layout group (wizard step)
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block rounded-sm shrink-0" style={{ width: markerSizePx, height: markerSizePx, backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }} />
          Question
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block rounded-sm shrink-0" style={{ width: markerSizePx, height: markerSizePx, backgroundColor: 'var(--bg-surface)', border: '1px dashed color-mix(in oklab, var(--glc-orange) 55%, var(--border-default))' }} />
          Identity (pre_brief)
        </span>
        <span>{QUESTION_BANK_STUDIO_COPY_EN.legend.solidEdges}</span>
        <span>{QUESTION_BANK_STUDIO_COPY_EN.legend.questionLeftStripe}</span>
        <span>{QUESTION_BANK_STUDIO_COPY_EN.legend.traceRingOuter}</span>
        <span>{QUESTION_BANK_STUDIO_COPY_EN.legend.feedDomain}</span>
        <span>{QUESTION_BANK_STUDIO_COPY_EN.legend.search}</span>
        {planFootprintSize !== null ? (
          <span>
            Plan footprint: <strong>{planFootprintSize}</strong> ids in trace plan.
          </span>
        ) : null}
      </div>
    </div>
  );
}
