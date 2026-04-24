import React from 'react';
import { Text, View } from '@react-pdf/renderer';

import { PDF_COPY_EN } from '../../../config/pdf-copy.en.js';
import { domainName, sanitizePdfText, scoreColor, scoreLabel } from '../lib/formatters.js';
import type { DomainRow } from '../lib/view-model.js';
import { pdfStyles as s } from '../styles.js';

export const ScorecardSection: React.FC<{
  domains: DomainRow[];
  overallScore: number | null;
}> = ({ domains, overallScore }) => {
  const scored = domains.filter(d => d.score != null && d.status === 'completed');
  return (
    <View style={s.sec}>
      {overallScore != null && (
        <View style={s.scoreBox}>
          <Text style={[s.scoreNum, { color: scoreColor(overallScore) }]}>{overallScore.toFixed(1)}</Text>
          <View>
            <Text style={s.scoreLbl}>{scoreLabel(overallScore)}</Text>
            <Text style={s.scoreSub}>{PDF_COPY_EN.scorecard.overallScoreSub(scored.length)}</Text>
          </View>
        </View>
      )}

      <Text style={s.secTitle}>{PDF_COPY_EN.scorecard.sectionTitle}</Text>
      <View>
        <View style={s.tblHdr}>
          <Text style={[s.tblHdrCell, { flex: 1 }]}>{PDF_COPY_EN.scorecard.colDomain}</Text>
          <Text style={[s.tblHdrCell, { width: 38 }]}>{PDF_COPY_EN.scorecard.colScore}</Text>
          <Text style={[s.tblHdrCell, { width: 66 }]}>{PDF_COPY_EN.scorecard.colStatus}</Text>
        </View>
        {scored.map((d, i) => (
          <View key={d.domain_key} style={[s.tblRow, i % 2 === 1 ? s.tblRowAlt : {}]}>
            <Text style={s.tblDomain}>{domainName(d.domain_key)}</Text>
            <Text style={s.tblScore}>
              {d.score}
              {PDF_COPY_EN.scorecard.scoreOutOfSuffix}
            </Text>
            <Text style={[s.tblBadge, { backgroundColor: scoreColor(d.score!) }]}>
              {sanitizePdfText(d.label ?? scoreLabel(d.score!))}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};
