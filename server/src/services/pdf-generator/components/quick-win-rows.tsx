import React from 'react';
import { Text, View } from '@react-pdf/renderer';

import type { DomainRow } from '../lib/view-model.js';
import { pdfStyles as s } from '../styles.js';

type Qw = NonNullable<DomainRow['quick_wins']>[number];

export const QuickWinRows: React.FC<{ items: Qw[] }> = ({ items }) => (
  <>
    {items.map((qw, i) => (
      <View key={i} style={s.qwRow}>
        <View style={s.qwDot} />
        <View style={s.qwBody}>
          <Text style={s.qwTitle}>
            {qw.title}
            {qw.timeframe ? ` (${qw.timeframe})` : ''}
          </Text>
          <Text style={s.qwDesc}>{qw.description}</Text>
        </View>
      </View>
    ))}
  </>
);
