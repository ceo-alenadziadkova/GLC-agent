import { Link } from 'react-router';
import { MarketingLayout } from '../marketing/MarketingLayout';
import { MarketingSection } from '../marketing/blocks/MarketingSection';
import { AuditCompare } from '../marketing/blocks/AuditCompare';
import { ProcessTimeline } from '../marketing/blocks/ProcessTimeline';
import { NextStepsCta } from '../marketing/blocks/NextStepsCta';
import { SnapshotTeaser, BriefTeaser } from '../marketing/blocks/RepeatingTeasers';
import { LOGIN_PATH } from '../marketing/marketing-nav';

const TIMELINE = [
  { title: 'Context and goals', detail: 'Brief, expectations, constraints, ownership.' },
  { title: 'Diagnostics', detail: 'Site and UX, digital footprint, processes, integrations, communications.' },
  { title: 'Synthesis', detail: 'Bottlenecks, risks, automation opportunities.' },
  { title: 'Deliverables', detail: 'Impact / effort prioritization, roadmap, implementation options with or without us.' },
];

export function FullAuditPage() {
  return (
    <MarketingLayout
      breadcrumbs={[
        { label: 'Home', to: '/' },
        { label: 'Full audit' },
      ]}
    >
      <MarketingSection>
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: 'var(--text-primary)' }}>
          Full audit
        </h1>
        <p className="mt-4 max-w-3xl text-lg leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Deep diagnostics: site, UX, structure, digital processes, integrations, communications, and automation—with a
          prioritized roadmap and clear next steps.
        </p>
      </MarketingSection>

      <MarketingSection className="mt-14">
        <h2 className="font-display text-xl font-bold sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
          Analysis areas
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {[
            'Public layer and UX: value clarity, trust, path to action.',
            'Technical and organizational signals affecting stability and scale.',
            'Processes and manual work: where time and quality leak.',
            'Integrations and data: gaps, duplication, risk.',
            'Automation: what to standardize first.',
            'Communications and roles: who owns digital decisions.',
          ].map(line => (
            <div
              key={line}
              className="rounded-xl border px-4 py-3 text-sm leading-relaxed"
              style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}
            >
              {line}
            </div>
          ))}
        </div>
      </MarketingSection>

      <MarketingSection className="mt-14">
        <h2 className="mb-6 font-display text-xl font-bold sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
          Current state → bottlenecks → recommendations → roadmap
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            ['Current state', 'How the system works today—a candid picture.'],
            ['Bottlenecks', 'Where friction hits the business and the customer most.'],
            ['Recommendations', 'What to change: quick wins and strategic initiatives.'],
            ['Roadmap', 'Sequence, dependencies, effort and impact sizing.'],
          ].map(([t, b]) => (
            <div
              key={t}
              className="relative rounded-xl border p-5"
              style={{
                borderColor: 'var(--border-subtle)',
                background: 'linear-gradient(165deg, var(--bg-surface) 0%, color-mix(in oklab, var(--bg-muted) 65%, var(--bg-surface)) 100%)',
              }}
            >
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--glc-orange)' }}>
                {t}
              </p>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {b}
              </p>
            </div>
          ))}
        </div>
      </MarketingSection>

      <MarketingSection className="mt-14">
        <h2 className="font-display text-xl font-bold sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
          Deliverables
        </h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          <li>Structured report with domain findings and cross-cutting themes.</li>
          <li>Priority matrix (impact / effort) and roadmap.</li>
          <li>Implementation options: GLC support or handoff to your team / partners.</li>
        </ul>
      </MarketingSection>

      <MarketingSection className="mt-14">
        <ProcessTimeline title="Typical process" steps={TIMELINE} />
      </MarketingSection>

      <MarketingSection className="mt-14">
        <h2 className="mb-6 font-display text-xl font-bold sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
          Compared to Express
        </h2>
        <AuditCompare />
      </MarketingSection>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <SnapshotTeaser />
        <BriefTeaser />
      </div>

      <div className="mt-14">
        <NextStepsCta
          steps={[
            { to: '/express-audit', label: 'Express audit', hint: 'If you want a shorter cycle before full coverage.' },
            { to: '/brief', label: 'Brief', hint: 'Align depth and scope.', primary: true },
            { to: '/faq', label: 'FAQ', hint: 'Delivery, timelines, collaboration.' },
            { to: LOGIN_PATH, label: 'Client sign-in', hint: 'Current reports and stages.' },
          ]}
        />
      </div>

      <p className="mt-8 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
        No site or clear structure yet—{' '}
        <Link to="/discovery" className="font-semibold" style={{ color: 'var(--glc-blue)' }}>
          Discovery
        </Link>
        .
      </p>
    </MarketingLayout>
  );
}
