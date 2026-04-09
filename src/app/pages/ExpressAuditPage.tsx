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
        { label: 'Express audit' },
      ]}
    >
      <MarketingSection>
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: 'var(--text-primary)' }}>
          Express audit
        </h1>
        <p className="mt-4 max-w-3xl text-lg leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          A fast, bounded format when you need an outside view and clear next steps without full process and integration
          depth.
        </p>
      </MarketingSection>

      <MarketingSection className="mt-14">
        <h2 className="font-display text-xl font-bold sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
          Who it is for
        </h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          <li>You need a first read before a board or budget cycle.</li>
          <li>You have a site and a clear pain, but not time for a long cycle.</li>
          <li>You want to validate a hypothesis before a large rollout.</li>
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
              <li>Focused review of the digital layer and key touchpoints.</li>
              <li>Obvious bottlenecks and quick wins.</li>
              <li>Priority guidance within the format.</li>
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
              <li>Full process and integration map.</li>
              <li>Deep technical or security pentest.</li>
              <li>Detailed implementation spec—that is a follow-on if needed.</li>
            </ul>
          </div>
        </div>
      </MarketingSection>

      <MarketingSection className="mt-14">
        <h2 className="font-display text-xl font-bold sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
          Outcome and timing
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Timelines depend on context; expect shorter than a full audit. Deliverable is a structured report with clear
          conclusions and suggested next steps.
        </p>
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
            ['Recommendations', 'What to change and in what order within Express.'],
            ['Next step', 'Escalate to full audit or targeted implementation.'],
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
          When Express is enough vs when you need full audit
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
            { to: '/audit', label: 'Full audit', hint: 'When you need processes, integrations, and a full roadmap.' },
            { to: '/faq', label: 'FAQ', hint: 'Timelines, communication, delivery.' },
            { to: '/brief', label: 'Brief with a specialist', hint: 'We match the format to your context.', primary: true },
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
