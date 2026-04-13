import { Link } from 'react-router';
import { MarketingLayout } from '../marketing/MarketingLayout';
import { MarketingSection } from '../marketing/blocks/MarketingSection';
import { AuditCompare } from '../marketing/blocks/AuditCompare';
import { ProcessTimeline } from '../marketing/blocks/ProcessTimeline';
import { NextStepsCta } from '../marketing/blocks/NextStepsCta';
import { SnapshotTeaser, DiscoveryTeaser } from '../marketing/blocks/RepeatingTeasers';
import { LOGIN_PATH } from '../marketing/marketing-nav';

const TIMELINE = [
  { title: 'Kickoff', detail: 'Short brief or scope alignment—without drowning in detail.' },
  { title: 'Signal gathering', detail: 'Site, key pages, baseline process questions within agreed volume.' },
  { title: 'Findings', detail: 'Priorities, risks, quick wins, and recommended next step.' },
  { title: 'Delivery', detail: 'Structured report you can use internally or with a vendor.' },
];

export function ExpressAuditPage() {
  return (
    <MarketingLayout
      breadcrumbs={[
        { label: 'Home', to: '/' },
        { label: 'Starter package' },
      ]}
    >
      <MarketingSection>
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: 'var(--text-primary)' }}>
          Starter package
        </h1>
        <p className="mt-4 max-w-3xl text-lg leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Starter is the focused option for one priority domain. You keep control over scope and get clear, actionable
          output without pretending it is full coverage.
        </p>
      </MarketingSection>

      <MarketingSection className="mt-14">
        <h2 className="font-display text-xl font-bold sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
          Who it is for
        </h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          <li>You have one urgent business problem and need fast external validation.</li>
          <li>You want to scope risk before committing to broader coverage.</li>
          <li>You need a clear next move and transparent limitations.</li>
        </ul>
      </MarketingSection>

      <MarketingSection className="mt-12">
        <div className="grid gap-10 lg:grid-cols-2">
          <div
            className="glc-card p-6 sm:p-8"
            style={{ borderRadius: 'var(--radius-2xl)', boxShadow: 'var(--shadow-card)' }}
          >
            <h3 className="font-display text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              Included
            </h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <li>One selected domain with detailed findings.</li>
              <li>Quick wins and priority guidance for that domain.</li>
              <li>Coverage disclosure in the report.</li>
            </ul>
          </div>
          <div
            className="glc-card p-6 sm:p-8"
            style={{ borderRadius: 'var(--radius-2xl)', boxShadow: 'var(--shadow-card)' }}
          >
            <h3 className="font-display text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              Not included
            </h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <li>Cross-domain synthesis confidence of a complete audit.</li>
              <li>Equal-score comparability with complete 6-domain audits.</li>
              <li>Multi-domain dependency certainty outside selected scope.</li>
            </ul>
          </div>
        </div>
      </MarketingSection>

      <MarketingSection className="mt-14">
        <h2 className="font-display text-xl font-bold sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
          Outcome and timing
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Timelines depend on context; Starter is typically the shortest paid path. Deliverable includes conclusions,
          next steps, and explicit coverage boundaries.
        </p>
      </MarketingSection>

      <MarketingSection className="mt-12">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              title: 'Business outcome',
              body: 'You get one clear priority track instead of scattered fixes across teams.',
            },
            {
              title: 'Decision confidence',
              body: 'You know where Starter is enough and where you should expand to Pro/Complete.',
            },
            {
              title: 'Execution handoff',
              body: 'Report format is ready for internal execution or transfer to another vendor.',
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
        <h2 className="mb-8 font-display text-xl font-bold sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
          From signal to decision
        </h2>
        <div
          className="grid gap-6 lg:grid-cols-4"
        >
          {[
            ['Signal', 'What the business and users see.'],
            ['Bottlenecks', 'Friction, loss, risk.'],
            ['Recommendations', 'What to change and in what order within Starter.'],
            ['Next step', 'Scale to Pro/Complete or go directly into implementation.'],
          ].map(([t, d]) => (
            <div
              key={t}
              className="rounded-xl border p-4 text-center"
              style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}
            >
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--glc-blue)' }}>
                {t}
              </p>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {d}
              </p>
            </div>
          ))}
        </div>
      </MarketingSection>

      <MarketingSection className="mt-14">
        <ProcessTimeline title="Typical process" steps={TIMELINE} />
      </MarketingSection>

      <MarketingSection className="mt-14">
        <h2 className="mb-6 font-display text-xl font-bold sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
          When Starter is enough vs when you need Pro or Complete
        </h2>
        <AuditCompare />
      </MarketingSection>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <SnapshotTeaser />
        <DiscoveryTeaser />
      </div>

      <div className="mt-14">
        <NextStepsCta
          steps={[
            { to: '/pro', label: 'Pro package', hint: 'When you need 2-3 domains with better cross-signal confidence.' },
            { to: '/complete', label: 'Complete package', hint: 'When you need full comparability and synthesis.' },
            { to: '/faq', label: 'FAQ', hint: 'Timelines, communication, delivery.' },
            { to: '/brief', label: 'Book a brief call', hint: 'We match the format to your context.', primary: true },
            { to: LOGIN_PATH, label: 'Client sign-in', hint: 'Reports and progress.' },
          ]}
        />
      </div>

      <p className="mt-8 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
        Still unsure? Start with{' '}
        <Link to="/snapshot" className="font-semibold" style={{ color: 'var(--glc-blue)' }}>
          Snapshot
        </Link>
        .
      </p>
    </MarketingLayout>
  );
}
