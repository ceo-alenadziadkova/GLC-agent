import React from 'react';
import { Page, Text, View } from '@react-pdf/renderer';
import { REPORT_PROFILE_LABELS, type ReportProfile } from '@glc/intake-core';

import { PDF_COPY_EN } from '../../../config/pdf-copy.en.js';
import { PDF_GLC_LOGO_GEOMETRY } from '../../../config/pdf-brand-geometry.js';
import { PDF_PAGE_LAYOUT } from '../../../config/pdf-layout.js';
import { fmtOverallScoreFraction, safeName, scoreColor } from '../lib/formatters.js';
import { pdfStyles as s } from '../styles.js';
import { GlcLogo } from './glc-logo.js';

export interface CoverPageProps {
  company: string;
  url: string;
  date: string;
  industry: string | null;
  profile: ReportProfile;
  score: number | null;
  brandSiteHost: string;
}

export const CoverPage: React.FC<CoverPageProps> = ({
  company,
  url,
  date,
  industry,
  profile,
  score,
  brandSiteHost,
}) => (
  <Page size="A4" style={s.coverPage}>
    <View
      style={{
        position: 'absolute',
        top: PDF_PAGE_LAYOUT.coverLogoOffsetTop,
        left: PDF_PAGE_LAYOUT.coverLogoOffsetLeft,
      }}
    >
      <GlcLogo size={PDF_GLC_LOGO_GEOMETRY.coverSize} />
    </View>

    <View style={s.coverBody}>
      <View style={s.coverBadge}>
        <Text style={s.coverBadgeText}>{REPORT_PROFILE_LABELS[profile].toUpperCase()}</Text>
      </View>

      <Text style={s.coverTitle}>{safeName(company)}</Text>
      <Text style={s.coverUrl}>{url}</Text>

      <View style={s.coverMeta}>
        <View style={s.coverMetaItem}>
          <Text style={s.coverMetaLabel}>{PDF_COPY_EN.cover.dateLabel}</Text>
          <Text style={s.coverMetaValue}>{date}</Text>
        </View>
        {industry && (
          <View style={s.coverMetaItem}>
            <Text style={s.coverMetaLabel}>{PDF_COPY_EN.cover.industryLabel}</Text>
            <Text style={s.coverMetaValue}>{industry}</Text>
          </View>
        )}
        {score != null && (
          <View style={s.coverMetaItem}>
            <Text style={s.coverMetaLabel}>{PDF_COPY_EN.cover.overallScoreLabel}</Text>
            <Text style={[s.coverMetaValue, { color: scoreColor(score) }]}>{fmtOverallScoreFraction(score)}</Text>
          </View>
        )}
      </View>
    </View>

    <View style={s.coverBar}>
      <Text style={s.coverBarBrand}>{PDF_COPY_EN.brandName}</Text>
      <Text style={s.coverBarUrl}>{brandSiteHost}</Text>
    </View>
  </Page>
);
