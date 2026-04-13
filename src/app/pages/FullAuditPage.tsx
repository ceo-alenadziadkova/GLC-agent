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
        { label: 'Complete package' },
      ]}
    >
      <MarketingSection>
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: 'var(--text-primary)' }}>
          Complete package
        </h1>
        <p className="mt-4 max-w-3xl text-lg leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Complete is full six-domain coverage for teams that need maximum comparability and end-to-end synthesis,
          not just a focused subset.
        </p>
      </MarketingSection>

      <MarketingSection className="mt-14">
        <h2 className="font-display text-xl font-bold sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
          Included domains
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {[
            'Tech infrastructure',
            'Security and compliance',
            'SEO and digital visibility',
            'UX and conversion',
            'Marketing and positioning',
            'Automation and processes',
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
          Package semantics
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            ['Starter', 'One selected domain. Fast scoped output with clear action points.'],
            ['Pro', 'Two to three domains. Better cross-signal confidence and tradeoff context.'],
            ['Complete', 'All six domains. Complete synthesis and highest comparability.'],
            ['Coverage note', 'Every report explicitly marks covered and not-analyzed domains.'],
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
          <li>Structured report with explicit coverage and comparability notes.</li>
          <li>Cross-domain synthesis across all six domains (strongest comparability baseline).</li>
          <li>Priority matrix (impact / effort) and roadmap.</li>
          <li>Implementation options: GLC support or handoff to your team / partners.</li>
        </ul>
      </MarketingSection>

      <MarketingSection className="mt-12">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              title: 'Executive confidence',
              body: 'Complete six-domain view reduces blind spots in strategic decisions.',
            },
            {
              title: 'Cross-team alignment',
              body: 'One shared roadmap helps product, marketing, and operations move in one direction.',
            },
            {
              title: 'Implementation readiness',
              body: 'Prioritized actions are structured for immediate execution and tracking.',
            },
          ].map(item => (
            <article
              key={item.title}
              className="glc-card p-5"
              style={{ borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-card)' }}
            >
              <h3 className="font-display text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {item.body}
              </p>
            </article>
          ))}
        </div>
      </MarketingSection>

      <MarketingSection className="mt-14">
        <ProcessTimeline title="Typical process" steps={TIMELINE} />
      </MarketingSection>

      <MarketingSection className="mt-14">
        <h2 className="mb-6 font-display text-xl font-bold sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
          Starter vs Pro vs Complete
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
            { to: '/starter', label: 'Starter', hint: 'One domain with a faster cycle.' },
            { to: '/pro', label: 'Pro', hint: 'Focused 2-3 domains.' },
            { to: '/brief', label: 'Book a brief call', hint: 'Align depth and scope.', primary: true },
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
