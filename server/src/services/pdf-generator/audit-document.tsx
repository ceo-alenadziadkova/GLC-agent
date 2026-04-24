/**
 * PDF document composition: ReportInput + ReportProfile → React-PDF tree.
 */

import React from 'react';
import { Document, Page, Text, View } from '@react-pdf/renderer';
import { REPORT_PROFILE_LABELS, type ReportProfile } from '@glc/intake-core';

import { PDF_COPY_EN } from '../../config/pdf-copy.en.js';
import { glcBrandSiteHostname } from '../../config/glc-brand-host.js';
import { PDF_PAGE_LAYOUT } from '../../config/pdf-layout.js';
import { CoverPage } from './components/cover-page.js';
import { DomainSection } from './components/domain-section.js';
import { IssueCard } from './components/issue-card.js';
import { PageFooter, PageHeader } from './components/page-chrome.js';
import { QuickWinRows } from './components/quick-win-rows.js';
import { RoadmapSection } from './components/roadmap-section.js';
import { ScorecardSection } from './components/scorecard-section.js';
import { domainName, fmtDate, safeName, sanitizePdfText } from './lib/formatters.js';
import {
  filterDomainsForPdf,
  selectOnepagerTopIssues,
  selectOnepagerTopQuickWins,
  selectOwnerTopIssues,
  selectOwnerTopRecs,
} from './lib/view-model.js';
import { pdfStyles as s, pdfTheme as C } from './styles.js';
import type { ReportInput } from '../report-profiler.js';
import { buildIdeaStageReadiness } from '../report-profiler/domain/idea-stage-readiness.js';

const BRAND_SITE_HOST = glcBrandSiteHostname();

export interface AuditDocumentProps {
  input: ReportInput;
  profile: ReportProfile;
}

export const AuditDocument: React.FC<AuditDocumentProps> = ({ input, profile }) => {
  const { audit, recon, domains, strategy } = input;
  const company = sanitizePdfText(recon?.company_name ?? audit.company_url);
  const date = fmtDate(audit.created_at);
  const industry = recon?.industry ?? audit.industry ?? null;
  const reportTitle = REPORT_PROFILE_LABELS[profile];
  const overallScore = audit.overall_score ?? null;

  const filteredDomains = filterDomainsForPdf(profile, domains);
  const ideaStageReadiness = buildIdeaStageReadiness(input);

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

  const ideaStageReadinessSection = ideaStageReadiness ? (
    <View style={s.sec}>
      <Text style={s.secTitle}>{PDF_COPY_EN.ideaStageReadiness.sectionTitle}</Text>
      <Text style={s.para}>
        {PDF_COPY_EN.ideaStageReadiness.validationSignalLabel}: {sanitizePdfText(ideaStageReadiness.validation_signal)}
      </Text>
      <Text style={s.para}>
        {PDF_COPY_EN.ideaStageReadiness.icpClarityLabel}: {sanitizePdfText(ideaStageReadiness.icp_clarity)}
      </Text>
      <Text style={s.para}>
        {PDF_COPY_EN.ideaStageReadiness.gtmTestsReadyLabel}:{' '}
        {ideaStageReadiness.gtm_test_ready ? PDF_COPY_EN.ideaStageReadiness.gtmYes : PDF_COPY_EN.ideaStageReadiness.gtmNo}
      </Text>
      {ideaStageReadiness.launch_constraint ? (
        <Text style={s.para}>
          {PDF_COPY_EN.ideaStageReadiness.launchConstraintLabel}: {sanitizePdfText(ideaStageReadiness.launch_constraint)}
        </Text>
      ) : null}
      <Text style={s.para}>
        {PDF_COPY_EN.ideaStageReadiness.noteLabel}: {sanitizePdfText(ideaStageReadiness.note)}
      </Text>
    </View>
  ) : null;

  const sectionWithPageBreak = (section: React.ReactNode, shouldBreak: boolean): React.ReactNode => {
    if (!section) return null;
    return <View break={PDF_PAGE_LAYOUT.sectionPerPage && shouldBreak}>{section}</View>;
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
          {strategy?.executive_summary
            ? sectionWithPageBreak(
                <View style={s.sec}>
                  <Text style={s.secTitle}>{PDF_COPY_EN.onepager.summary}</Text>
                  <Text style={s.para}>{sanitizePdfText(strategy.executive_summary)}</Text>
                </View>,
                false,
              )
            : null}
          {ideaStageReadinessSection ? sectionWithPageBreak(ideaStageReadinessSection, true) : null}
          {sectionWithPageBreak(<ScorecardSection domains={filteredDomains} overallScore={overallScore} />, true)}
          {topIssues.length > 0
            ? sectionWithPageBreak(
                <View style={[s.sec, s.secCompactTop]}>
                  <Text style={s.secTitle}>{PDF_COPY_EN.onepager.topIssues}</Text>
                  {topIssues.map(issue => (
                    <IssueCard key={issue.id} issue={issue} />
                  ))}
                </View>,
                true,
              )
            : null}
          {topQw.length > 0
            ? sectionWithPageBreak(
                <View style={s.sec}>
                  <Text style={s.secTitle}>{PDF_COPY_EN.onepager.quickWins}</Text>
                  <QuickWinRows items={topQw} />
                </View>,
                true,
              )
            : null}
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
          {ideaStageReadinessSection ? sectionWithPageBreak(ideaStageReadinessSection, false) : null}
          {sectionWithPageBreak(<ScorecardSection domains={filteredDomains} overallScore={null} />, true)}
          {filteredDomains.map((d, i) => (
            <View key={d.domain_key} break={PDF_PAGE_LAYOUT.sectionPerPage}>
              {i > 0 && <View style={s.divider} />}
              <DomainSection domain={d} showRecs />
            </View>
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
          {strategy?.executive_summary
            ? sectionWithPageBreak(
                <View style={s.sec}>
                  <Text style={s.secTitle}>{PDF_COPY_EN.owner.executiveSummary}</Text>
                  <Text style={s.para}>{sanitizePdfText(strategy.executive_summary)}</Text>
                </View>,
                false,
              )
            : null}
          {ideaStageReadinessSection ? sectionWithPageBreak(ideaStageReadinessSection, true) : null}
          {sectionWithPageBreak(<ScorecardSection domains={filteredDomains} overallScore={overallScore} />, true)}
          {topIssues.length > 0
            ? sectionWithPageBreak(
                <View style={s.sec}>
                  <View style={s.divider} />
                  <Text style={s.secTitle}>{PDF_COPY_EN.owner.priorityIssues}</Text>
                  {topIssues.map(issue => (
                    <IssueCard key={`${issue.domainKey}:${issue.id}`} issue={issue} domainKey={issue.domainKey} />
                  ))}
                </View>,
                true,
              )
            : null}
          {topRecs.length > 0
            ? sectionWithPageBreak(
                <View style={s.sec}>
                  <Text style={s.secTitle}>{PDF_COPY_EN.owner.recommendedActions}</Text>
                  {topRecs.map(rec => (
                    <View key={`${rec.domainKey}:${rec.id}`} style={s.bulRow}>
                      <View style={[s.bulDot, { backgroundColor: C.blue }]} />
                      <View style={s.flexFill}>
                        <Text style={s.ownerRecTitle}>
                          {sanitizePdfText(rec.title)} {PDF_COPY_EN.owner.recDomainLabel(domainName(rec.domainKey))}
                        </Text>
                        {(rec.estimated_cost || rec.estimated_time) && (
                          <Text style={s.ownerRecMeta}>
                            {PDF_COPY_EN.domain.ownerRecCostTime(
                              rec.estimated_cost ?? dash,
                              rec.estimated_time ?? dash,
                            )}
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>,
                true,
              )
            : null}
          {sectionWithPageBreak(
            <View>
              <View style={s.divider} />
              <RoadmapSection strategy={strategy} />
            </View>,
            true,
          )}
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
        {strategy?.executive_summary
          ? sectionWithPageBreak(
              <View style={s.sec}>
                <Text style={s.secTitle}>{PDF_COPY_EN.full.executiveSummary}</Text>
                <Text style={s.para}>{sanitizePdfText(strategy.executive_summary)}</Text>
              </View>,
              false,
            )
          : null}
        {ideaStageReadinessSection ? sectionWithPageBreak(ideaStageReadinessSection, true) : null}
        {sectionWithPageBreak(<ScorecardSection domains={filteredDomains} overallScore={overallScore} />, true)}
        {filteredDomains.map(d => (
          <View key={d.domain_key} break={PDF_PAGE_LAYOUT.sectionPerPage}>
            <View style={s.divider} />
            <DomainSection domain={d} showRecs />
          </View>
        ))}
        {sectionWithPageBreak(
          <View>
            <View style={s.divider} />
            <RoadmapSection strategy={strategy} />
          </View>,
          true,
        )}
      </Page>
    </Document>
  );
};
