import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { MarketingLayout } from '../marketing/MarketingLayout';
import { MarketingSection } from '../marketing/blocks/MarketingSection';
import { AuditCompare } from '../marketing/blocks/AuditCompare';
import { MarketingComparisonShell } from '../marketing/blocks/MarketingComparisonShell';
import { MarketingRevealMask } from '../marketing/blocks/MarketingRevealMask';
import { NextStepsCta } from '../marketing/blocks/NextStepsCta';
import { LOGIN_PATH } from '../marketing/marketing-nav';
import workspacePackaging from '../data/marketing-workspace-packaging.en.json';
import { WORKSPACE_PAGE_COPY } from '../config/workspace-page-copy';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../components/ui/accordion';

const snapshotVsWorkspace = workspacePackaging.faq.snapshot_vs_workspace;

const FAQ_ITEMS: { q: string; a: ReactNode }[] = [
  {
    q: 'Where should I start?',
    a: 'If you lack clarity—Snapshot. If you need one domain—Focus. For 2-3 coordinated domains—Context. For full cross-domain synthesis—Strategy workspace. No site—Discovery.',
  },
  {
    q: snapshotVsWorkspace.question,
    a: snapshotVsWorkspace.answer,
  },
  {
    q: 'How do Focus, Context, and Strategy workspace differ?',
    a: 'Focus covers one domain. Context covers 2-3 domains with stronger dependency context. Strategy workspace covers all six domains with full synthesis and best score comparability.',
  },
  {
    q: 'What if I do not have a website yet?',
    a: (
      <>
        Start with{' '}
        <Link to="/discovery" className="ds-marketing-inline-link-accent">
          Discovery
        </Link>
        —we help clarify the problem and next step before a fixed brief.
      </>
    ),
  },
  {
    q: 'Can I do only Discovery?',
    a: 'Yes. It is a standalone, low-pressure entry. You decide whether to continue with a workspace run or implementation support.',
  },
  {
    q: 'What do I get at the end?',
    a: 'Structured findings, explicit scope notes, and prioritized actions. Strategy workspace also includes full six-domain synthesis with the strongest cross-domain comparability.',
  },
  {
    q: 'How do I know which tier is enough for my case?',
    a: 'Use Brief for a guided recommendation. Focus is one domain, Context is 2-3 domains, Strategy workspace is full six-domain coverage when cross-domain certainty matters most.',
  },
  {
    q: 'Do you implement afterwards?',
    a: 'Yes, when agreed. The output is also written for self-serve or third-party delivery.',
  },
  {
    q: 'Can we implement without you?',
    a: 'Yes. We include clear next steps and criteria so another vendor can continue without losing context.',
  },
  {
    q: 'How long does it take?',
    a: 'Depends on tier and scope: Focus is usually fastest, then Context, then Strategy workspace. Exact timelines are fixed after the brief.',
  },
  {
    q: 'Do I need technical prep on my side?',
    a: 'No. Business context and accesses we agree upfront are enough. We collect technical detail inside the run.',
  },
  {
    q: 'How do we communicate?',
    a: 'Usually async plus calls at key milestones. You pick the channel in the brief.',
  },
  {
    q: 'I know the problem but not the solution—what then?',
    a: 'Focus, Context, or Strategy workspace can fit—we help with options and tradeoffs. You can start with the brief.',
  },
  {
    q: 'Where does an existing client sign in?',
    a: (
      <>
        Use the{' '}
        <Link to={LOGIN_PATH} className="ds-marketing-inline-link-accent">
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
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl ds-text-primary" >
          Questions and answers
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed ds-text-secondary" >
          Short notes on formats, timelines, and how we work—practical detail without fluff.
        </p>
      </MarketingSection>

      <MarketingSection>
        <h2 className="font-display text-xl font-bold sm:text-2xl ds-text-primary" >
          {WORKSPACE_PAGE_COPY.faqPage.compareMatrixTitle}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed ds-text-secondary" >
          {WORKSPACE_PAGE_COPY.faqPage.compareMatrixLead}
        </p>
        <MarketingRevealMask className="mt-8">
          <MarketingComparisonShell>
            <AuditCompare emphasisColumn="pro" />
          </MarketingComparisonShell>
        </MarketingRevealMask>
      </MarketingSection>

      <MarketingSection>
        <Accordion type="single" collapsible className="w-full max-w-3xl">
          {FAQ_ITEMS.map((item, i) => (
            <AccordionItem key={item.q} value={`faq-${i}`}>
              <AccordionTrigger className="text-left text-base font-semibold">{item.q}</AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed ds-text-secondary" >
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </MarketingSection>

      <div>
        <NextStepsCta
          steps={[
            { to: '/brief', label: 'Brief', hint: 'Personal guidance.', primary: true },
            { to: '/snapshot', label: 'Snapshot', hint: 'Fast start from public signals.' },
            { to: LOGIN_PATH, label: 'Sign in', hint: 'Client dashboard.' },
          ]}
        />
      </div>
    </MarketingLayout>
  );
}
