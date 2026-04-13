import { Link } from 'react-router';
import { MarketingLayout } from '../marketing/MarketingLayout';
import { MarketingSection } from '../marketing/blocks/MarketingSection';
import { AuditCompare } from '../marketing/blocks/AuditCompare';
import { ProcessTimeline } from '../marketing/blocks/ProcessTimeline';
import { NextStepsCta } from '../marketing/blocks/NextStepsCta';
import { SnapshotTeaser, BriefTeaser } from '../marketing/blocks/RepeatingTeasers';
import { LOGIN_PATH } from '../marketing/marketing-nav';

const TIMELINE = [
  { title: 'Scope alignment', detail: 'Choose 2-3 domains that match your current bottlenecks and objectives.' },
  { title: 'Focused diagnostics', detail: 'Deep checks inside selected domains with cross-signal context.' },
  { title: 'Synthesis', detail: 'Tradeoffs, dependencies, and what to do first vs what can wait.' },
  { title: 'Delivery', detail: 'Action plan with sequencing and handoff-ready recommendations.' },
];

export function ProAuditPage() {
  return (
    <MarketingLayout
      breadcrumbs={[
        { label: 'Home', to: '/' },
        { label: 'Pro package' },
      ]}
    >
      <MarketingSection>
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: 'var(--text-primary)' }}>
          Pro package
        </h1>
        <p className="mt-4 max-w-3xl text-lg leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Pro is the middle path when one domain is too narrow and full six-domain coverage is unnecessary. You select
          2-3 domains and get stronger confidence on cross-domain dependencies.
        </p>
      </MarketingSection>

      <MarketingSection className="mt-14">
        <h2 className="font-display text-xl font-bold sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
          Who Pro is for
        </h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          <li>You already know the main problem area, but it touches adjacent systems.</li>
          <li>You need better sequencing confidence than Starter can provide.</li>
          <li>You want a practical roadmap without paying for full six-domain depth.</li>
        </ul>
      </MarketingSection>

      <MarketingSection className="mt-12">
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="glc-card p-6 sm:p-8" style={{ borderRadius: 'var(--radius-2xl)', boxShadow: 'var(--shadow-card)' }}>
            <h3 className="font-display text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              Included
            </h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <li>Two to three selected domains with focused depth.</li>
              <li>Dependency notes between selected domains.</li>
              <li>Impact/effort-based action sequence and next-step options.</li>
            </ul>
          </div>
          <div className="glc-card p-6 sm:p-8" style={{ borderRadius: 'var(--radius-2xl)', boxShadow: 'var(--shadow-card)' }}>
            <h3 className="font-display text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              Not included
            </h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <li>Complete cross-domain certainty across all six domains.</li>
              <li>Highest comparability level of Complete package reports.</li>
              <li>Strategy confidence of a full end-to-end synthesis run.</li>
            </ul>
          </div>
        </div>
      </MarketingSection>

      <MarketingSection className="mt-12">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              title: 'Business outcome',
              body: 'You reduce decision risk where multiple domains influence one bottleneck.',
            },
            {
              title: 'Planning clarity',
              body: 'Dependencies are explicit, so teams avoid fixing isolated symptoms.',
            },
            {
              title: 'Budget control',
              body: 'You get broader confidence than Starter without full six-domain scope.',
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
        <ProcessTimeline title="Typical Pro flow" steps={TIMELINE} />
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
            { to: '/starter', label: 'Starter', hint: 'One urgent domain first.' },
            { to: '/complete', label: 'Complete', hint: 'All six domains with full synthesis.' },
            { to: '/brief', label: 'Book a brief call', hint: 'Get help selecting the right 2-3 domains.', primary: true },
            { to: '/faq', label: 'FAQ', hint: 'Delivery, timelines, and collaboration model.' },
            { to: LOGIN_PATH, label: 'Client sign-in', hint: 'Current reports and audit progress.' },
          ]}
        />
      </div>

      <p className="mt-8 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
        If you are unsure which domains to include, start with{' '}
        <Link to="/brief" className="font-semibold" style={{ color: 'var(--glc-blue)' }}>
          Brief
        </Link>
        .
      </p>
    </MarketingLayout>
  );
}
