import React from 'react';
import { Text, View } from '@react-pdf/renderer';

import { PDF_COPY_EN } from '../../../config/pdf-copy.en.js';
import type { ReportInput } from '../../report-profiler.js';
import { pdfStyles as s, pdfTheme as C } from '../styles.js';

type StrategyItem = { title: string; description?: string | null };

const RoadmapPhase: React.FC<{ color: string; title: string; items: StrategyItem[] }> = ({
  color,
  title,
  items,
}) => (
  <View style={s.rmSec}>
    <View style={s.rmPhHdr}>
      <View style={[s.rmDot, { backgroundColor: color }]} />
      <Text style={s.rmPhTitle}>{title}</Text>
    </View>
    {items.map((item, i) => (
      <View key={i} style={s.rmItem}>
        <View style={s.rmBullet} />
        <Text style={s.rmText}>
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>{item.title}</Text>
          {item.description ? `: ${item.description}` : ''}
        </Text>
      </View>
    ))}
  </View>
);

export const RoadmapSection: React.FC<{ strategy: ReportInput['strategy'] }> = ({ strategy }) => {
  if (!strategy) return null;
  const qw = strategy.quick_wins ?? [];
  const mt = strategy.medium_term ?? [];
  const st = strategy.strategic ?? [];
  if (!qw.length && !mt.length && !st.length) return null;

  return (
    <View style={s.sec}>
      <Text style={s.secTitle}>{PDF_COPY_EN.roadmap.sectionTitle}</Text>
      {qw.length > 0 && <RoadmapPhase color={C.green} title={PDF_COPY_EN.roadmap.phaseQuickWins} items={qw} />}
      {mt.length > 0 && (
        <RoadmapPhase color={C.sevMedium} title={PDF_COPY_EN.roadmap.phaseMediumTerm} items={mt} />
      )}
      {st.length > 0 && <RoadmapPhase color={C.blue} title={PDF_COPY_EN.roadmap.phaseStrategic} items={st} />}
    </View>
  );
};
