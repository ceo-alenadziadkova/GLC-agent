/**
 * PDF Generator — Sprint 20
 *
 * Produces a branded A4 PDF from ReportInput + ReportProfile.
 * Uses @react-pdf/renderer (pure JS — no Chromium, Railway-safe).
 *
 * Design system: GLC brand identity from glctech.es
 *   - Navy cover page (#0F1729)
 *   - White content pages, Helvetica typography
 *   - Brand accents: green #0ECF82 / orange #F24F1D / blue #1CBDFF
 *   - GLC logo reproduced as 3 overlapping coloured squares (matches logo.svg)
 */

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
  type DocumentProps,
} from '@react-pdf/renderer';
import type { ReportInput } from './report-profiler.js';
import { PROFILE_LABELS, type ReportProfile } from './report-profiler.js';

// ─── Brand Palette ────────────────────────────────────────────────────────────

const C = {
  navy:   '#0F1729',
  green:  '#0ECF82',
  orange: '#F24F1D',
  blue:   '#1CBDFF',
  white:  '#FFFFFF',
  text:   '#111827',
  sub:    '#6B7280',
  bg:     '#F9FAFB',
  border: '#E5E7EB',
} as const;

// Which domain keys each profile shows (mirrors report-profiler.ts PROFILE_DOMAINS)
const PROFILE_DOMAIN_FILTER: Record<ReportProfile, string[] | 'all'> = {
  full:      'all',
  owner:     'all',
  tech:      ['tech_infrastructure', 'security_compliance'],
  marketing: ['seo_digital', 'ux_conversion', 'marketing_utp'],
  onepager:  'all',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 4.5) return C.green;
  if (score >= 3.5) return '#22C55E';
  if (score >= 2.5) return '#EAB308';
  if (score >= 1.5) return '#F97316';
  return '#EF4444';
}

function sevColor(sev: string): string {
  if (sev === 'critical') return '#EF4444';
  if (sev === 'high')     return '#F97316';
  if (sev === 'medium')   return '#EAB308';
  return C.sub;
}

function domainName(key: string): string {
  const m: Record<string, string> = {
    tech_infrastructure:  'Tech Infrastructure',
    security_compliance:  'Security & Compliance',
    seo_digital:          'SEO & Digital Presence',
    ux_conversion:        'UX & Conversion',
    marketing_utp:        'Marketing & Positioning',
    automation_processes: 'Automation & Processes',
  };
  return m[key] ?? key;
}

function scoreLabel(score: number): string {
  const m: Record<number, string> = {
    1: 'Critical', 2: 'Needs Work', 3: 'Moderate', 4: 'Good', 5: 'Excellent',
  };
  return m[Math.round(score)] ?? '';
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function safeName(s: string): string {
  return s.replace(/[^a-zA-Z0-9\s]/g, '').trim().slice(0, 60);
}

type DomainRow = ReportInput['domains'][0];

// ─── StyleSheet ───────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  // ── Cover ────────────────────────────────────────────────────────────────
  coverPage:      { backgroundColor: C.navy, fontFamily: 'Helvetica', padding: 0 },
  coverBody:      { flex: 1, padding: 48, justifyContent: 'flex-end', paddingBottom: 44 },

  coverBadge:     { backgroundColor: C.green, alignSelf: 'flex-start', borderRadius: 3, paddingHorizontal: 10, paddingVertical: 3.5, marginBottom: 20 },
  coverBadgeText: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: C.navy },

  coverTitle:     { fontSize: 28, fontFamily: 'Helvetica-Bold', color: C.white, marginBottom: 8, lineHeight: 1.2 },
  coverUrl:       { fontSize: 10.5, color: '#8BA3C7', marginBottom: 40 },
  coverMeta:      { flexDirection: 'row' },
  coverMetaItem:  { marginRight: 28 },
  coverMetaLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#5B7299', marginBottom: 2 },
  coverMetaValue: { fontSize: 10, color: C.white },

  coverBar:       { backgroundColor: C.green, paddingHorizontal: 48, paddingVertical: 13, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  coverBarBrand:  { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: C.navy },
  coverBarUrl:    { fontSize: 8, color: '#0A5C3B' },

  // ── Content page ─────────────────────────────────────────────────────────
  // paddingTop/Bottom leave room for the fixed header/footer (position:absolute)
  contentPage:    { fontFamily: 'Helvetica', backgroundColor: C.white, paddingTop: 60, paddingBottom: 46, paddingHorizontal: 44, fontSize: 9.5, color: C.text },

  // Fixed page header — absolute-positioned, repeats on every page via `fixed` prop
  pHdr:           { position: 'absolute', top: 14, left: 44, right: 44, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  pHdrLeft:       { flexDirection: 'row', alignItems: 'center' },
  pHdrCompany:    { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: C.sub, marginLeft: 6 },
  pHdrSep:        { fontSize: 7.5, color: '#CBD5E1', marginHorizontal: 4 },
  pHdrReport:     { fontSize: 7.5, color: C.sub },
  pHdrDate:       { fontSize: 7.5, color: C.sub },

  // Fixed footer
  pFtr:           { position: 'absolute', bottom: 14, left: 44, right: 44, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: C.border, paddingTop: 6 },
  pFtrLeft:       { fontSize: 7, color: C.sub },
  pFtrRight:      { fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.green },

  // ── Sections ─────────────────────────────────────────────────────────────
  sec:            { marginBottom: 22 },
  secTitle:       { fontSize: 12.5, fontFamily: 'Helvetica-Bold', color: C.navy, paddingLeft: 9, borderLeftWidth: 3, borderLeftColor: C.green, marginBottom: 10 },
  subTitle:       { fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: C.text, marginTop: 10, marginBottom: 4 },
  para:           { fontSize: 9.5, lineHeight: 1.6, color: C.text },
  divider:        { borderBottomWidth: 1, borderBottomColor: C.border, marginVertical: 20 },

  // ── Overall score box ─────────────────────────────────────────────────────
  scoreBox:       { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg, borderRadius: 8, padding: 16, marginBottom: 18 },
  scoreNum:       { fontSize: 44, fontFamily: 'Helvetica-Bold', lineHeight: 1, marginRight: 16 },
  scoreLbl:       { fontSize: 13, fontFamily: 'Helvetica-Bold', color: C.text, marginBottom: 3 },
  scoreSub:       { fontSize: 8.5, color: C.sub },

  // ── Scorecard table ───────────────────────────────────────────────────────
  tblHdr:         { flexDirection: 'row', backgroundColor: C.navy, paddingVertical: 7, paddingHorizontal: 10, borderRadius: 3 },
  tblHdrCell:     { fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.white },
  tblRow:         { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: C.border, alignItems: 'center' },
  tblRowAlt:      { backgroundColor: C.bg },
  tblDomain:      { fontSize: 9, color: C.text, flex: 1 },
  tblScore:       { fontSize: 9, fontFamily: 'Helvetica-Bold', width: 38 },
  tblBadge:       { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3, fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: C.white, width: 66, textAlign: 'center' },

  // ── Domain section ────────────────────────────────────────────────────────
  domainWrap:     { marginBottom: 20 },
  domainHdr:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  domainTitle:    { fontSize: 11.5, fontFamily: 'Helvetica-Bold', color: C.navy, paddingLeft: 9, borderLeftWidth: 3, borderLeftColor: C.green, flex: 1 },
  domainBadge:    { width: 32, height: 32, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  domainBadgeNum: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: C.white },
  domainSummary:  { fontSize: 9.5, lineHeight: 1.6, color: C.text, marginBottom: 6 },

  // ── Bullet rows (strengths / weaknesses) ─────────────────────────────────
  bulRow:         { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 3 },
  bulDot:         { width: 4, height: 4, borderRadius: 2, marginTop: 4, marginRight: 6 },
  bulText:        { flex: 1, fontSize: 9, color: C.text, lineHeight: 1.5 },

  // ── Issues ────────────────────────────────────────────────────────────────
  issCard:        { flexDirection: 'row', marginBottom: 5 },
  issBar:         { width: 3, borderRadius: 2, marginRight: 9 },
  issBody:        { flex: 1 },
  issTitleRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  issBadge:       { paddingHorizontal: 5, paddingVertical: 1.5, borderRadius: 3, marginRight: 5 },
  issBadgeText:   { fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: C.white },
  issTitle:       { fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.text, flex: 1 },
  issDesc:        { fontSize: 8.5, color: C.sub, lineHeight: 1.5 },

  // ── Quick wins ────────────────────────────────────────────────────────────
  qwRow:          { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 5 },
  qwDot:          { width: 6, height: 6, borderRadius: 3, backgroundColor: C.green, marginTop: 2, marginRight: 7 },
  qwBody:         { flex: 1 },
  qwTitle:        { fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.text },
  qwDesc:         { fontSize: 8.5, color: C.sub, lineHeight: 1.5 },

  // ── Roadmap ───────────────────────────────────────────────────────────────
  rmSec:          { marginBottom: 12 },
  rmPhHdr:        { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  rmDot:          { width: 8, height: 8, borderRadius: 4, marginRight: 7 },
  rmPhTitle:      { fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.text },
  rmItem:         { flexDirection: 'row', paddingLeft: 15, marginBottom: 4 },
  rmBullet:       { width: 3, height: 3, borderRadius: 1.5, backgroundColor: C.sub, marginTop: 4, marginRight: 6 },
  rmText:         { flex: 1, fontSize: 9, color: C.text, lineHeight: 1.5 },
});

// ─── GLC Logo ─────────────────────────────────────────────────────────────────
// Recreates logo.svg: 3 rounded squares in a diagonal stack
// Offsets derived from SVG viewBox="0 0 32 32" coordinates

const GlcLogo: React.FC<{ size?: number }> = ({ size = 28 }) => {
  const sq = Math.round(size * 0.433);             // square size ≈ 13.84/32
  const r  = Math.max(2, Math.round(sq * 0.22));   // border radius
  return (
    <View style={{ width: size, height: size }}>
      {/* Green — top-right */}
      <View style={{ position: 'absolute', left: size - sq, top: 0,
        width: sq, height: sq, borderRadius: r, backgroundColor: '#0ECF82' }} />
      {/* Orange — centre */}
      <View style={{ position: 'absolute',
        left: Math.round(size * 0.27), top: Math.round(size * 0.30),
        width: sq, height: sq, borderRadius: r, backgroundColor: '#F24F1D' }} />
      {/* Blue — bottom-left */}
      <View style={{ position: 'absolute', left: 0, top: size - sq,
        width: sq, height: sq, borderRadius: r, backgroundColor: '#1CBDFF' }} />
    </View>
  );
};

// ─── Cover Page ───────────────────────────────────────────────────────────────

interface CoverProps {
  company: string; url: string; date: string;
  industry: string | null; profile: ReportProfile; score: number | null;
}

const CoverPage: React.FC<CoverProps> = ({ company, url, date, industry, profile, score }) => (
  <Page size="A4" style={s.coverPage}>
    <View style={{ position: 'absolute', top: 40, left: 48 }}>
      <GlcLogo size={32} />
    </View>

    <View style={s.coverBody}>
      <View style={s.coverBadge}>
        <Text style={s.coverBadgeText}>{PROFILE_LABELS[profile].toUpperCase()}</Text>
      </View>

      <Text style={s.coverTitle}>{safeName(company)}</Text>
      <Text style={s.coverUrl}>{url}</Text>

      <View style={s.coverMeta}>
        <View style={s.coverMetaItem}>
          <Text style={s.coverMetaLabel}>DATE</Text>
          <Text style={s.coverMetaValue}>{date}</Text>
        </View>
        {industry && (
          <View style={s.coverMetaItem}>
            <Text style={s.coverMetaLabel}>INDUSTRY</Text>
            <Text style={s.coverMetaValue}>{industry}</Text>
          </View>
        )}
        {score != null && (
          <View style={s.coverMetaItem}>
            <Text style={s.coverMetaLabel}>OVERALL SCORE</Text>
            <Text style={[s.coverMetaValue, { color: scoreColor(score) }]}>
              {score.toFixed(1)} / 5
            </Text>
          </View>
        )}
      </View>
    </View>

    <View style={s.coverBar}>
      <Text style={s.coverBarBrand}>GLC Audit Platform</Text>
      <Text style={s.coverBarUrl}>glctech.es</Text>
    </View>
  </Page>
);

// ─── Fixed Page Fixtures ──────────────────────────────────────────────────────

const PageHeader: React.FC<{ company: string; report: string; date: string }> = ({ company, report, date }) => (
  <View style={s.pHdr} fixed>
    <View style={s.pHdrLeft}>
      <GlcLogo size={16} />
      <Text style={s.pHdrCompany}>{safeName(company)}</Text>
      <Text style={s.pHdrSep}>·</Text>
      <Text style={s.pHdrReport}>{report}</Text>
    </View>
    <Text style={s.pHdrDate}>{date}</Text>
  </View>
);

const PageFooter: React.FC = () => (
  <View style={s.pFtr} fixed>
    <Text style={s.pFtrLeft}>GLC Audit Platform · glctech.es</Text>
    <Text
      style={s.pFtrRight}
      render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
        `${pageNumber} / ${totalPages}`
      }
    />
  </View>
);

// ─── Section Components ───────────────────────────────────────────────────────

const ScorecardSection: React.FC<{
  domains: DomainRow[];
  overallScore: number | null;
}> = ({ domains, overallScore }) => {
  const scored = domains.filter(d => d.score != null && d.status === 'completed');
  return (
    <View style={s.sec}>
      {overallScore != null && (
        <View style={s.scoreBox}>
          <Text style={[s.scoreNum, { color: scoreColor(overallScore) }]}>
            {overallScore.toFixed(1)}
          </Text>
          <View>
            <Text style={s.scoreLbl}>{scoreLabel(overallScore)}</Text>
            <Text style={s.scoreSub}>
              Overall score · {scored.length} domain{scored.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
      )}

      <Text style={s.secTitle}>Domain Scorecard</Text>
      <View>
        <View style={s.tblHdr}>
          <Text style={[s.tblHdrCell, { flex: 1 }]}>DOMAIN</Text>
          <Text style={[s.tblHdrCell, { width: 38 }]}>SCORE</Text>
          <Text style={[s.tblHdrCell, { width: 66 }]}>STATUS</Text>
        </View>
        {scored.map((d, i) => (
          <View key={d.domain_key} style={[s.tblRow, i % 2 === 1 ? s.tblRowAlt : {}]}>
            <Text style={s.tblDomain}>{domainName(d.domain_key)}</Text>
            <Text style={s.tblScore}>{d.score}/5</Text>
            <Text style={[s.tblBadge, { backgroundColor: scoreColor(d.score!) }]}>
              {d.label ?? scoreLabel(d.score!)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

interface IssueCardProps {
  issue: { severity: string; title: string; description: string; impact?: string };
  domainKey?: string;
}
const IssueCard: React.FC<IssueCardProps> = ({ issue, domainKey }) => (
  <View style={s.issCard}>
    <View style={[s.issBar, { backgroundColor: sevColor(issue.severity) }]} />
    <View style={s.issBody}>
      <View style={s.issTitleRow}>
        <View style={[s.issBadge, { backgroundColor: sevColor(issue.severity) }]}>
          <Text style={s.issBadgeText}>{issue.severity.toUpperCase()}</Text>
        </View>
        <Text style={s.issTitle}>
          {issue.title}{domainKey ? ` — ${domainName(domainKey)}` : ''}
        </Text>
      </View>
      <Text style={s.issDesc}>{issue.impact ?? issue.description}</Text>
    </View>
  </View>
);

const DomainSection: React.FC<{
  domain: DomainRow;
  maxIssues?: number;
  maxQw?: number;
  showRecs?: boolean;
}> = ({ domain: d, maxIssues = 999, maxQw = 999, showRecs = true }) => {
  const strengths  = (d.strengths   ?? []) as string[];
  const weaknesses = (d.weaknesses  ?? []) as string[];
  const issues     = (d.issues      ?? []).slice(0, maxIssues);
  const quickWins  = (d.quick_wins  ?? []).slice(0, maxQw);
  const recs       = showRecs ? (d.recommendations ?? []) : [];

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
          <Text style={s.subTitle}>Strengths</Text>
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
          <Text style={s.subTitle}>Areas for Improvement</Text>
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
          <Text style={s.subTitle}>Issues</Text>
          {issues.map((issue, i) => (
            <IssueCard key={i} issue={issue} />
          ))}
        </View>
      )}

      {quickWins.length > 0 && (
        <View>
          <Text style={s.subTitle}>Quick Wins</Text>
          {quickWins.map((qw, i) => (
            <View key={i} style={s.qwRow}>
              <View style={s.qwDot} />
              <View style={s.qwBody}>
                <Text style={s.qwTitle}>
                  {qw.title}{qw.timeframe ? ` (${qw.timeframe})` : ''}
                </Text>
                <Text style={s.qwDesc}>{qw.description}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {recs.length > 0 && (
        <View>
          <Text style={s.subTitle}>Recommendations</Text>
          {recs.map((rec, i) => (
            <View key={i} style={s.bulRow}>
              <View style={[s.bulDot, { backgroundColor: C.blue }]} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold' }}>
                  {rec.title}{rec.priority ? ` [${rec.priority}]` : ''}
                </Text>
                <Text style={{ fontSize: 8.5, color: C.sub, lineHeight: 1.5 }}>
                  {rec.description}
                  {(rec.estimated_cost || rec.estimated_time)
                    ? ` · Cost: ${rec.estimated_cost ?? '—'} / Time: ${rec.estimated_time ?? '—'}`
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

type StrategyItem = { title: string; description?: string | null };
const RoadmapPhase: React.FC<{ color: string; title: string; items: StrategyItem[] }> = ({ color, title, items }) => (
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

const RoadmapSection: React.FC<{ strategy: ReportInput['strategy'] }> = ({ strategy }) => {
  if (!strategy) return null;
  const qw = strategy.quick_wins ?? [];
  const mt = strategy.medium_term ?? [];
  const st = strategy.strategic   ?? [];
  if (!qw.length && !mt.length && !st.length) return null;

  return (
    <View style={s.sec}>
      <Text style={s.secTitle}>Strategic Roadmap</Text>
      {qw.length > 0 && <RoadmapPhase color={C.green}   title="Quick Wins (up to 1 week)" items={qw} />}
      {mt.length > 0 && <RoadmapPhase color="#EAB308"   title="Medium Term (~1 month)"     items={mt} />}
      {st.length > 0 && <RoadmapPhase color={C.blue}    title="Strategic (1–3 months)"     items={st} />}
    </View>
  );
};

// ─── Main Document ────────────────────────────────────────────────────────────

interface AuditDocumentProps {
  input: ReportInput;
  profile: ReportProfile;
}

const AuditDocument: React.FC<AuditDocumentProps> = ({ input, profile }) => {
  const { audit, recon, domains, strategy } = input;
  const company     = recon?.company_name ?? audit.company_url;
  const date        = fmtDate(audit.created_at);
  const industry    = recon?.industry ?? audit.industry ?? null;
  const reportTitle = PROFILE_LABELS[profile];
  const overallScore = audit.overall_score ?? null;

  // Filter to completed domains allowed by this profile
  const filter = PROFILE_DOMAIN_FILTER[profile];
  const filteredDomains: DomainRow[] = (
    filter === 'all'
      ? domains
      : domains.filter(d => (filter as string[]).includes(d.domain_key))
  ).filter(d => d.status === 'completed');

  const coverProps: CoverProps = { company, url: audit.company_url, date, industry, profile, score: overallScore };
  const docMeta = { title: `GLC Audit — ${safeName(company)}`, author: 'GLC Audit Platform', producer: 'glctech.es' };

  // ── Onepager ──────────────────────────────────────────────────────────────
  if (profile === 'onepager') {
    const topIssues = filteredDomains
      .flatMap(d => d.issues ?? [])
      .filter(i => i.severity === 'critical' || i.severity === 'high')
      .slice(0, 3);
    const topQw = filteredDomains.flatMap(d => d.quick_wins ?? []).slice(0, 3);

    return (
      <Document {...docMeta}>
        <CoverPage {...coverProps} />
        <Page size="A4" style={s.contentPage} wrap>
          <PageHeader company={company} report={reportTitle} date={date} />
          <PageFooter />
          {strategy?.executive_summary && (
            <View style={s.sec}>
              <Text style={s.secTitle}>Summary</Text>
              <Text style={s.para}>{strategy.executive_summary}</Text>
            </View>
          )}
          <ScorecardSection domains={filteredDomains} overallScore={overallScore} />
          {topIssues.length > 0 && (
            <View style={[s.sec, { marginTop: 8 }]}>
              <Text style={s.secTitle}>Top Issues</Text>
              {topIssues.map((issue, i) => <IssueCard key={i} issue={issue} />)}
            </View>
          )}
          {topQw.length > 0 && (
            <View style={s.sec}>
              <Text style={s.secTitle}>Quick Wins</Text>
              {topQw.map((qw, i) => (
                <View key={i} style={s.qwRow}>
                  <View style={s.qwDot} />
                  <View style={s.qwBody}>
                    <Text style={s.qwTitle}>{qw.title}{qw.timeframe ? ` (${qw.timeframe})` : ''}</Text>
                    <Text style={s.qwDesc}>{qw.description}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </Page>
      </Document>
    );
  }

  // ── Tech / Marketing (domain-focused) ────────────────────────────────────
  if (profile === 'tech' || profile === 'marketing') {
    return (
      <Document {...docMeta}>
        <CoverPage {...coverProps} />
        <Page size="A4" style={s.contentPage} wrap>
          <PageHeader company={company} report={reportTitle} date={date} />
          <PageFooter />
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

  // ── Owner (executive view) ────────────────────────────────────────────────
  if (profile === 'owner') {
    const topIssues = filteredDomains
      .flatMap(d => (d.issues ?? []).map(i => ({ ...i, domainKey: d.domain_key })))
      .filter(i => i.severity === 'critical' || i.severity === 'high')
      .slice(0, 5);
    const topRecs = filteredDomains
      .flatMap(d => (d.recommendations ?? [])
        .filter(r => r.priority === 'high')
        .map(r => ({ ...r, domainKey: d.domain_key })))
      .slice(0, 8);

    return (
      <Document {...docMeta}>
        <CoverPage {...coverProps} />
        <Page size="A4" style={s.contentPage} wrap>
          <PageHeader company={company} report={reportTitle} date={date} />
          <PageFooter />
          {strategy?.executive_summary && (
            <View style={s.sec}>
              <Text style={s.secTitle}>Executive Summary</Text>
              <Text style={s.para}>{strategy.executive_summary}</Text>
            </View>
          )}
          <ScorecardSection domains={filteredDomains} overallScore={overallScore} />
          {topIssues.length > 0 && (
            <>
              <View style={s.divider} />
              <View style={s.sec}>
                <Text style={s.secTitle}>Priority Issues</Text>
                {topIssues.map((issue, i) => (
                  <IssueCard key={i} issue={issue} domainKey={issue.domainKey} />
                ))}
              </View>
            </>
          )}
          {topRecs.length > 0 && (
            <View style={s.sec}>
              <Text style={s.secTitle}>Recommended Actions</Text>
              {topRecs.map((rec, i) => (
                <View key={i} style={s.bulRow}>
                  <View style={[s.bulDot, { backgroundColor: C.blue }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold' }}>
                      {rec.title} ({domainName(rec.domainKey)})
                    </Text>
                    {(rec.estimated_cost || rec.estimated_time) && (
                      <Text style={{ fontSize: 8, color: C.sub }}>
                        Cost: {rec.estimated_cost ?? '—'} · Time: {rec.estimated_time ?? '—'}
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

  // ── Full (default) ────────────────────────────────────────────────────────
  return (
    <Document {...docMeta}>
      <CoverPage {...coverProps} />
      <Page size="A4" style={s.contentPage} wrap>
        <PageHeader company={company} report={reportTitle} date={date} />
        <PageFooter />
        {strategy?.executive_summary && (
          <View style={s.sec}>
            <Text style={s.secTitle}>Executive Summary</Text>
            <Text style={s.para}>{strategy.executive_summary}</Text>
          </View>
        )}
        <ScorecardSection domains={filteredDomains} overallScore={overallScore} />
        {filteredDomains.map((d, i) => (
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

// ─── Public API ───────────────────────────────────────────────────────────────

export class PdfGenerator {
  /**
   * Render a branded A4 PDF for the given audit input and profile.
   * Returns a Buffer — send directly as application/pdf in Express.
   */
  async generate(input: ReportInput, profile: ReportProfile = 'full'): Promise<Buffer> {
    const element = React.createElement(AuditDocument, { input, profile }) as React.ReactElement<DocumentProps>;
    return renderToBuffer(element);
  }
}

export const pdfGenerator = new PdfGenerator();
