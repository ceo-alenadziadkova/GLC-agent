/**
 * PDF document composition: ReportInput + ReportProfile → React-PDF tree.
 */

import React from 'react';
import { Document, Page, Text, View } from '@react-pdf/renderer';
import { REPORT_PROFILE_LABELS, type ReportProfile } from '@glc/intake-core';

import { PDF_COPY_EN } from '../../config/pdf-copy.en.js';
import { glcBrandSiteHostname } from '../../config/glc-brand-host.js';
import { CoverPage } from './components/cover-page.js';
import { DomainSection } from './components/domain-section.js';
import { IssueCard } from './components/issue-card.js';
import { PageFooter, PageHeader } from './components/page-chrome.js';
import { QuickWinRows } from './components/quick-win-rows.js';
import { RoadmapSection } from './components/roadmap-section.js';
import { ScorecardSection } from './components/scorecard-section.js';
import { domainName, fmtDate, safeName } from './lib/formatters.js';
import {
  filterDomainsForPdf,
  selectOnepagerTopIssues,
  selectOnepagerTopQuickWins,
  selectOwnerTopIssues,
  selectOwnerTopRecs,
} from './lib/view-model.js';
import { pdfStyles as s, pdfTheme as C } from './styles.js';
import type { ReportInput } from '../report-profiler.js';

const BRAND_SITE_HOST = glcBrandSiteHostname();

export interface AuditDocumentProps {
  input: ReportInput;
  profile: ReportProfile;
}

export const AuditDocument: React.FC<AuditDocumentProps> = ({ input, profile }) => {
  const { audit, recon, domains, strategy } = input;
  const company = recon?.company_name ?? audit.company_url;
  const date = fmtDate(audit.created_at);
  const industry = recon?.industry ?? audit.industry ?? null;
  const reportTitle = REPORT_PROFILE_LABELS[profile];
  const overallScore = audit.overall_score ?? null;

  const filteredDomains = filterDomainsForPdf(profile, domains);

  const coverProps = {
    company,
    url: audit.company_url,
    date,
    industry,
    profile,
    score: overallScore,
    brandSiteHost: BRAND_SITE_HOST,
  };

  const docMeta = {
    title: `${PDF_COPY_EN.documentTitlePrefix} ${safeName(company)}`,
    author: PDF_COPY_EN.metaAuthor,
    producer: BRAND_SITE_HOST,
  };

  if (profile === 'onepager') {
    const topIssues = selectOnepagerTopIssues(filteredDomains);
    const topQw = selectOnepagerTopQuickWins(filteredDomains);

    return (
      <Document {...docMeta}>
        <CoverPage {...coverProps} />
        <Page size="A4" style={s.contentPage} wrap>
          <PageHeader company={company} report={reportTitle} date={date} />
          <PageFooter brandSiteHost={BRAND_SITE_HOST} />
          {strategy?.executive_summary && (
            <View style={s.sec}>
              <Text style={s.secTitle}>{PDF_COPY_EN.onepager.summary}</Text>
              <Text style={s.para}>{strategy.executive_summary}</Text>
            </View>
          )}
          <ScorecardSection domains={filteredDomains} overallScore={overallScore} />
          {topIssues.length > 0 && (
            <View style={[s.sec, { marginTop: 8 }]}>
              <Text style={s.secTitle}>{PDF_COPY_EN.onepager.topIssues}</Text>
              {topIssues.map((issue, i) => (
                <IssueCard key={i} issue={issue} />
              ))}
            </View>
          )}
          {topQw.length > 0 && (
            <View style={s.sec}>
              <Text style={s.secTitle}>{PDF_COPY_EN.onepager.quickWins}</Text>
              <QuickWinRows items={topQw} />
            </View>
          )}
        </Page>
      </Document>
    );
  }

  if (profile === 'tech' || profile === 'marketing') {
    return (
      <Document {...docMeta}>
        <CoverPage {...coverProps} />
        <Page size="A4" style={s.contentPage} wrap>
          <PageHeader company={company} report={reportTitle} date={date} />
          <PageFooter brandSiteHost={BRAND_SITE_HOST} />
          <ScorecardSection domains={filteredDomains} overallScore={null} />
          {filteredDomains.map((d, i) => (
            <React.Fragment key={d.domain_key}>
              {i > 0 && <View style={s.divider} />}
              <DomainSection domain={d} showRecs />
            </React.Fragment>
          ))}
        </Page>
      </Document>
    );
  }

  if (profile === 'owner') {
    const topIssues = selectOwnerTopIssues(filteredDomains);
    const topRecs = selectOwnerTopRecs(filteredDomains);
    const dash = PDF_COPY_EN.placeholders.emDash;

    return (
      <Document {...docMeta}>
        <CoverPage {...coverProps} />
        <Page size="A4" style={s.contentPage} wrap>
          <PageHeader company={company} report={reportTitle} date={date} />
          <PageFooter brandSiteHost={BRAND_SITE_HOST} />
          {strategy?.executive_summary && (
            <View style={s.sec}>
              <Text style={s.secTitle}>{PDF_COPY_EN.owner.executiveSummary}</Text>
              <Text style={s.para}>{strategy.executive_summary}</Text>
            </View>
          )}
          <ScorecardSection domains={filteredDomains} overallScore={overallScore} />
          {topIssues.length > 0 && (
            <>
              <View style={s.divider} />
              <View style={s.sec}>
                <Text style={s.secTitle}>{PDF_COPY_EN.owner.priorityIssues}</Text>
                {topIssues.map((issue, i) => (
                  <IssueCard key={i} issue={issue} domainKey={issue.domainKey} />
                ))}
              </View>
            </>
          )}
          {topRecs.length > 0 && (
            <View style={s.sec}>
              <Text style={s.secTitle}>{PDF_COPY_EN.owner.recommendedActions}</Text>
              {topRecs.map((rec, i) => (
                <View key={i} style={s.bulRow}>
                  <View style={[s.bulDot, { backgroundColor: C.blue }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold' }}>
                      {rec.title} ({domainName(rec.domainKey)})
                    </Text>
                    {(rec.estimated_cost || rec.estimated_time) && (
                      <Text style={{ fontSize: 8, color: C.sub }}>
                        {PDF_COPY_EN.domain.ownerRecCostTime(
                          rec.estimated_cost ?? dash,
                          rec.estimated_time ?? dash,
                        )}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
          <View style={s.divider} />
          <RoadmapSection strategy={strategy} />
        </Page>
      </Document>
    );
  }

  return (
    <Document {...docMeta}>
      <CoverPage {...coverProps} />
      <Page size="A4" style={s.contentPage} wrap>
        <PageHeader company={company} report={reportTitle} date={date} />
        <PageFooter brandSiteHost={BRAND_SITE_HOST} />
        {strategy?.executive_summary && (
          <View style={s.sec}>
            <Text style={s.secTitle}>{PDF_COPY_EN.full.executiveSummary}</Text>
            <Text style={s.para}>{strategy.executive_summary}</Text>
          </View>
        )}
        <ScorecardSection domains={filteredDomains} overallScore={overallScore} />
        {filteredDomains.map(d => (
          <React.Fragment key={d.domain_key}>
            <View style={s.divider} />
            <DomainSection domain={d} showRecs />
          </React.Fragment>
        ))}
        <View style={s.divider} />
        <RoadmapSection strategy={strategy} />
      </Page>
    </Document>
  );
};
