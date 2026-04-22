import React from 'react';
import { Text, View } from '@react-pdf/renderer';

import { domainName, sanitizePdfText, sevColor } from '../lib/formatters.js';
import { pdfStyles as s } from '../styles.js';

export interface IssueCardProps {
  issue: { severity: string; title: string; description: string; impact?: string };
  domainKey?: string;
}

export const IssueCard: React.FC<IssueCardProps> = ({ issue, domainKey }) => (
  <View style={s.issCard}>
    <View style={[s.issBar, { backgroundColor: sevColor(issue.severity) }]} />
    <View style={s.issBody}>
      <View style={s.issTitleRow}>
        <View style={[s.issBadge, { backgroundColor: sevColor(issue.severity) }]}>
          <Text style={s.issBadgeText}>{sanitizePdfText(issue.severity.toUpperCase())}</Text>
        </View>
        <Text style={s.issTitle}>
          {sanitizePdfText(issue.title)}
          {domainKey ? ` — ${domainName(domainKey)}` : ''}
        </Text>
      </View>
      <Text style={s.issDesc}>{sanitizePdfText(issue.impact ?? issue.description)}</Text>
    </View>
  </View>
);
