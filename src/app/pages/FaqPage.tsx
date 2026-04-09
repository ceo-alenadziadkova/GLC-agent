import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { MarketingLayout } from '../marketing/MarketingLayout';
import { MarketingSection } from '../marketing/blocks/MarketingSection';
import { NextStepsCta } from '../marketing/blocks/NextStepsCta';
import { SnapshotTeaser, DiscoveryTeaser, BriefTeaser } from '../marketing/blocks/RepeatingTeasers';
import { LOGIN_PATH } from '../marketing/marketing-nav';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../components/ui/accordion';

const FAQ_ITEMS: { q: string; a: ReactNode }[] = [
  {
    q: 'Where should I start?',
    a: 'If you lack clarity—Snapshot. If context is clear and you need depth—full audit. In between—Express. No site—Discovery.',
  },
  {
    q: 'How is Snapshot different from Express?',
    a: 'Snapshot is a fast automated read on available site signals. Express is an agreed scope of expert review with focused conclusions.',
  },
  {
    q: 'How is Express different from a full audit?',
    a: 'Express is shorter and narrower. Full audit covers processes, integrations, automation, and a full impact / effort roadmap.',
  },
  {
    q: 'What if I do not have a website yet?',
    a: (
      <>
        Start with{' '}
        <Link to="/discovery" style={{ color: 'var(--glc-blue)' }}>
          Discovery
        </Link>
        —we help clarify the problem and next step before a fixed brief.
      </>
    ),
  },
  {
    q: 'Can I do only Discovery?',
    a: 'Yes. It is a standalone, low-pressure entry. You decide whether to continue with an audit or implementation.',
  },
  {
    q: 'What do I get at the end of an audit?',
    a: 'Structured findings, priorities, roadmap, and automation / improvement recommendations—in a format easy to hand to your team.',
  },
  {
    q: 'Do you implement afterwards?',
    a: 'Yes, when agreed. The report is also written for self-serve or third-party delivery.',
  },
  {
    q: 'Can we implement without you?',
    a: 'Yes. We include clear next steps and criteria so another vendor can continue without losing context.',
  },
  {
    q: 'How long does it take?',
    a: 'Depends on format and scope: Express is faster; full audit takes longer. Exact timelines are fixed after the brief.',
  },
  {
    q: 'Do I need technical prep on my side?',
    a: 'No. Business context and accesses we agree upfront are enough. We collect technical detail inside the audit.',
  },
  {
    q: 'How do we communicate?',
    a: 'Usually async plus calls at key milestones. You pick the channel in the brief.',
  },
  {
    q: 'I know the problem but not the solution—what then?',
    a: 'Express or full audit fits—we help with options and tradeoffs. You can start with the brief.',
  },
  {
    q: 'Where does an existing client sign in?',
    a: (
      <>
        Use the{' '}
        <Link to={LOGIN_PATH} style={{ color: 'var(--glc-blue)' }}>
          sign-in page
        </Link>
        —dashboard, reports, progress, and materials for active projects.
      </>
    ),
  },
];

export function FaqPage() {
  return (
    <MarketingLayout
      breadcrumbs={[
        { label: 'Home', to: '/' },
        { label: 'FAQ' },
      ]}
    >
      <MarketingSection>
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: 'var(--text-primary)' }}>
          Questions and answers
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Short notes on formats, timelines, and how we work—without marketing fluff.
        </p>
      </MarketingSection>

      <MarketingSection className="mt-10">
        <Accordion type="single" collapsible className="w-full max-w-3xl">
          {FAQ_ITEMS.map((item, i) => (
            <AccordionItem key={item.q} value={`faq-${i}`}>
              <AccordionTrigger className="text-left text-base font-semibold">{item.q}</AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </MarketingSection>

      <MarketingSection className="mt-14">
        <div className="grid gap-6 md:grid-cols-3">
          <SnapshotTeaser />
          <DiscoveryTeaser />
          <BriefTeaser />
        </div>
      </MarketingSection>

      <div className="mt-14">
        <NextStepsCta
          steps={[
            { to: '/snapshot', label: 'Snapshot', hint: 'Fast start.' },
            { to: '/brief', label: 'Brief', hint: 'Personal guidance.', primary: true },
            { to: LOGIN_PATH, label: 'Sign in', hint: 'Client dashboard.' },
          ]}
        />
      </div>
    </MarketingLayout>
  );
}
