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
    <div className="rounded-lg px-3 py-2 ds-panel-canvas" >
      <div className="text-[length:var(--text-2xs)] font-semibold uppercase mb-1 ds-text-tertiary" >
        {QUESTION_BANK_STUDIO_COPY_EN.legend.title}
      </div>
      <div className="grid gap-1.5 mobile:grid-cols-2" style={legendStyle}>
        <span className="flex items-center gap-2">
          <span className="ds-studio-legend-marker ds-studio-legend-marker--root" style={{ width: markerSizePx, height: markerSizePx }} />
          Root
        </span>
        <span className="flex items-center gap-2">
          <span className="ds-studio-legend-marker ds-studio-legend-marker--section" style={{ width: markerSizePx, height: markerSizePx }} />
          Section (schema)
        </span>
        <span className="flex items-center gap-2">
          <span
            className="ds-studio-legend-marker ds-studio-legend-marker--domain"
            style={{
              width: markerSizePx,
              height: markerSizePx,
              ['--studio-legend-marker-dash' as string]: domainBorderColor,
            }}
          />
          Domain group (primary feed)
        </span>
        <span className="flex items-center gap-2">
          <span
            className="ds-studio-legend-marker ds-studio-legend-marker--layout"
            style={{
              width: markerSizePx,
              height: markerSizePx,
              ['--studio-legend-marker-dash' as string]: layoutBorderColor,
            }}
          />
          Layout group (wizard step)
        </span>
        <span className="flex items-center gap-2">
          <span className="ds-studio-legend-marker ds-studio-legend-marker--question" style={{ width: markerSizePx, height: markerSizePx }} />
          Question
        </span>
        <span className="flex items-center gap-2">
          <span className="ds-studio-legend-marker ds-studio-legend-marker--identity" style={{ width: markerSizePx, height: markerSizePx }} />
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
