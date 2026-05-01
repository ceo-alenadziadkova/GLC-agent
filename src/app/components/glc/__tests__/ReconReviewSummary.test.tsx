import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReconReviewSummary } from '../ReconReviewSummary';
import { PIPELINE_MONITOR_COPY } from '../../../config/pipeline-monitor-copy';
import type { ReconData } from '../../../data/auditTypes';

const reconFixture: ReconData = {
  id: 'r1',
  audit_id: 'a1',
  status: 'completed',
  company_name: 'Acme',
  industry: 'Healthcare',
  location: 'Palma',
  languages: [],
  tech_stack: {},
  social_profiles: {},
  contact_info: { emails: [], phones: [], addresses: [] },
  pages_crawled: [],
  brief: null,
  interview_answers: null,
  recon_context_summary: {
    mode: 'idea_only',
    source_labels: ['intake_brief'],
    known_facts: ['Company: Acme'],
    inferred_insights: [{ text: 'Idea-stage context only', confidence: 'low' }],
    missing_inputs: ['Public website URL or equivalent digital footprint'],
    recommended_next_steps: ['Confirm problem statement'],
    consultant_hints: ['Ask the client to add a deck or screenshots.'],
    generated_at: new Date().toISOString(),
  },
};

describe('ReconReviewSummary', () => {
  it('shows context summary placeholder when recon_context_summary is absent', () => {
    render(
      <ReconReviewSummary
        recon={{ ...reconFixture, recon_context_summary: undefined }}
        copy={PIPELINE_MONITOR_COPY.reviewModal.recon}
        showCrawlerTruncationWarning={false}
      />,
    );
    expect(screen.getByText(PIPELINE_MONITOR_COPY.reviewModal.recon.contextSummaryTitle)).toBeInTheDocument();
    expect(screen.getByText(PIPELINE_MONITOR_COPY.reviewModal.recon.contextSummaryUnavailableBody)).toBeInTheDocument();
  });

  it('renders context summary sections when recon_context_summary exists', () => {
    render(
      <ReconReviewSummary
        recon={reconFixture}
        copy={PIPELINE_MONITOR_COPY.reviewModal.recon}
        showCrawlerTruncationWarning={false}
      />,
    );
    expect(screen.getByText(PIPELINE_MONITOR_COPY.reviewModal.recon.contextSummaryTitle)).toBeInTheDocument();
    expect(screen.getByText(PIPELINE_MONITOR_COPY.reviewModal.recon.contextKnownFactsTitle)).toBeInTheDocument();
    expect(screen.getByText('Company: Acme')).toBeInTheDocument();
    expect(screen.getByText(PIPELINE_MONITOR_COPY.reviewModal.recon.contextNextStepsTitle)).toBeInTheDocument();
    expect(screen.getByText(PIPELINE_MONITOR_COPY.reviewModal.recon.contextConsultantHintsTitle)).toBeInTheDocument();
    expect(screen.getByText('Ask the client to add a deck or screenshots.')).toBeInTheDocument();
  });
});
