import React from 'react';
import { Text, View } from '@react-pdf/renderer';

import { PDF_COPY_EN } from '../../../config/pdf-copy.en.js';
import { PDF_PAGE_LAYOUT } from '../../../config/pdf-layout.js';
import { safeName, sanitizePdfText } from '../lib/formatters.js';
import { pdfStyles as s } from '../styles.js';
import { GlcLogo } from './glc-logo.js';

export const PageHeader: React.FC<{ company: string; report: string; date: string }> = ({
  company,
  report,
  date,
}) => (
  <View style={s.pHdr} fixed>
    <View style={s.pHdrLeft}>
      <GlcLogo size={PDF_PAGE_LAYOUT.headerInlineLogoSize} />
      <Text style={s.pHdrCompany}>{safeName(company)}</Text>
      <Text style={s.pHdrSep}>{PDF_COPY_EN.pageChrome.headerSeparator}</Text>
      <Text style={s.pHdrReport}>{sanitizePdfText(report)}</Text>
    </View>
    <Text style={s.pHdrDate}>{sanitizePdfText(date)}</Text>
  </View>
);

export const PageFooter: React.FC<{ brandSiteHost: string }> = ({ brandSiteHost }) => (
  <View style={s.pFtr} fixed>
    <Text style={s.pFtrLeft}>
      {PDF_COPY_EN.brandName} {PDF_COPY_EN.pageChrome.footerSeparator} {sanitizePdfText(brandSiteHost)}
    </Text>
    <Text
      style={s.pFtrRight}
      render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
        PDF_COPY_EN.pageChrome.pageCounter(pageNumber, totalPages)
      }
    />
  </View>
);
