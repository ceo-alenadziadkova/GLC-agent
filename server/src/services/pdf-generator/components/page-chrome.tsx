import React from 'react';
import { Text, View } from '@react-pdf/renderer';

import { PDF_COPY_EN } from '../../../config/pdf-copy.en.js';
import { PDF_PAGE_LAYOUT } from '../../../config/pdf-layout.js';
import { safeName } from '../lib/formatters.js';
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
      <Text style={s.pHdrSep}>·</Text>
      <Text style={s.pHdrReport}>{report}</Text>
    </View>
    <Text style={s.pHdrDate}>{date}</Text>
  </View>
);

export const PageFooter: React.FC<{ brandSiteHost: string }> = ({ brandSiteHost }) => (
  <View style={s.pFtr} fixed>
    <Text style={s.pFtrLeft}>
      {PDF_COPY_EN.brandName} · {brandSiteHost}
    </Text>
    <Text
      style={s.pFtrRight}
      render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
        `${pageNumber} / ${totalPages}`
      }
    />
  </View>
);
