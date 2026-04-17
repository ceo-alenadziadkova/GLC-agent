import React from 'react';
import { Text, View } from '@react-pdf/renderer';

import { PDF_COPY_EN } from '../../../config/pdf-copy.en.js';
import {
  REPORT_PDF_DOMAIN_ISSUES_MAX,
  REPORT_PDF_DOMAIN_QUICK_WINS_MAX,
} from '../../../config/report-profiler-limits.js';
import { domainName, scoreColor } from '../lib/formatters.js';
import type { DomainRow } from '../lib/view-model.js';
import { pdfStyles as s, pdfTheme as C } from '../styles.js';
import { IssueCard } from './issue-card.js';
import { QuickWinRows } from './quick-win-rows.js';

export const DomainSection: React.FC<{
  domain: DomainRow;
  maxIssues?: number;
  maxQw?: number;
  showRecs?: boolean;
}> = ({
  domain: d,
  maxIssues = REPORT_PDF_DOMAIN_ISSUES_MAX,
  maxQw = REPORT_PDF_DOMAIN_QUICK_WINS_MAX,
  showRecs = true,
}) => {
  const strengths = (d.strengths ?? []) as string[];
  const weaknesses = (d.weaknesses ?? []) as string[];
  const issues = (d.issues ?? []).slice(0, maxIssues);
  const quickWins = (d.quick_wins ?? []).slice(0, maxQw);
  const recs = showRecs ? (d.recommendations ?? []) : [];
  const dash = PDF_COPY_EN.placeholders.emDash;

  return (
    <View style={s.domainWrap}>
      <View style={s.domainHdr}>
        <Text style={s.domainTitle}>{domainName(d.domain_key)}</Text>
        {d.score != null && (
          <View style={[s.domainBadge, { backgroundColor: scoreColor(d.score) }]}>
            <Text style={s.domainBadgeNum}>{d.score}</Text>
          </View>
        )}
      </View>

      {d.summary && <Text style={s.domainSummary}>{d.summary}</Text>}

      {strengths.length > 0 && (
        <View>
          <Text style={s.subTitle}>{PDF_COPY_EN.domain.strengths}</Text>
          {strengths.map((str, i) => (
            <View key={i} style={s.bulRow}>
              <View style={[s.bulDot, { backgroundColor: C.green }]} />
              <Text style={s.bulText}>{str}</Text>
            </View>
          ))}
        </View>
      )}

      {weaknesses.length > 0 && (
        <View>
          <Text style={s.subTitle}>{PDF_COPY_EN.domain.areasForImprovement}</Text>
          {weaknesses.map((w, i) => (
            <View key={i} style={s.bulRow}>
              <View style={[s.bulDot, { backgroundColor: C.sub }]} />
              <Text style={s.bulText}>{w}</Text>
            </View>
          ))}
        </View>
      )}

      {issues.length > 0 && (
        <View>
          <Text style={s.subTitle}>{PDF_COPY_EN.domain.issues}</Text>
          {issues.map((issue, i) => (
            <IssueCard key={i} issue={issue} />
          ))}
        </View>
      )}

      {quickWins.length > 0 && (
        <View>
          <Text style={s.subTitle}>{PDF_COPY_EN.domain.quickWins}</Text>
          <QuickWinRows items={quickWins} />
        </View>
      )}

      {recs.length > 0 && (
        <View>
          <Text style={s.subTitle}>{PDF_COPY_EN.domain.recommendations}</Text>
          {recs.map((rec, i) => (
            <View key={i} style={s.bulRow}>
              <View style={[s.bulDot, { backgroundColor: C.blue }]} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold' }}>
                  {rec.title}
                  {rec.priority ? ` [${rec.priority}]` : ''}
                </Text>
                <Text style={{ fontSize: 8.5, color: C.sub, lineHeight: 1.5 }}>
                  {rec.description}
                  {rec.estimated_cost || rec.estimated_time
                    ? PDF_COPY_EN.domain.recCostTime(rec.estimated_cost ?? dash, rec.estimated_time ?? dash)
                    : ''}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};
