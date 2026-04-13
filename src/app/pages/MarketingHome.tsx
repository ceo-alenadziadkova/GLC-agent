import { Link } from 'react-router';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, CheckCircle } from '@phosphor-icons/react';
import { MarketingLayout } from '../marketing/MarketingLayout';
import { MarketingSection } from '../marketing/blocks/MarketingSection';
import { DecisionPath } from '../marketing/blocks/DecisionPath';
import { AuditCompare } from '../marketing/blocks/AuditCompare';
import { NextStepsCta } from '../marketing/blocks/NextStepsCta';
import { LOGIN_PATH } from '../marketing/marketing-nav';
import { usePublicBrand } from '../marketing/PublicBrandContext';
import marketingHomeCopy from '../data/marketing-home-copy.en.json';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../components/ui/accordion';
import { cn } from '../components/ui/utils';

type HeadingVariant = 'bar' | 'rail' | 'minimal';

function SectionHeading({
  title,
  description,
  className,
  variant = 'bar',
}: {
  title: string;
  description?: string;
  className?: string;
  variant?: HeadingVariant;
}) {
  if (variant === 'minimal') {
    return (
      <div className={cn('max-w-3xl', className)}>
        <h2
          className="font-display text-2xl font-bold tracking-tight sm:text-3xl"
          style={{ color: 'var(--text-primary)', letterSpacing: 'var(--tracking-tight)' }}
        >
          {title}
        </h2>
        {description ? (
          <p className="mt-3 max-w-2xl text-base leading-relaxed sm:text-[1.02rem]" style={{ color: 'var(--text-secondary)' }}>
            {description}
          </p>
        ) : null}
      </div>
    );
  }

  if (variant === 'rail') {
    return (
      <div
        className={cn('max-w-3xl border-l-2 pl-5 sm:pl-6', className)}
        style={{ borderColor: 'var(--glc-blue)' }}
      >
        <h2
          className="font-display text-2xl font-bold tracking-tight sm:text-3xl"
          style={{ color: 'var(--text-primary)', letterSpacing: 'var(--tracking-tight)' }}
        >
          {title}
        </h2>
        {description ? (
          <p className="mt-3 max-w-2xl text-base leading-relaxed sm:text-[1.02rem]" style={{ color: 'var(--text-secondary)' }}>
            {description}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn('max-w-3xl', className)}>
      <div
        className="mb-4 h-1 w-12 rounded-full sm:w-14"
        style={{ background: 'var(--gradient-brand)' }}
        aria-hidden
      />
      <h2
        className="font-display text-2xl font-bold tracking-tight sm:text-3xl"
        style={{ color: 'var(--text-primary)', letterSpacing: 'var(--tracking-tight)' }}
      >
        {title}
      </h2>
      {description ? (
        <p className="mt-3 max-w-2xl text-base leading-relaxed sm:text-[1.02rem]" style={{ color: 'var(--text-secondary)' }}>
          {description}
        </p>
      ) : null}
    </div>
  );
}

export function MarketingHome() {
  return (
    <MarketingLayout>
      <MarketingHomeInner />
    </MarketingLayout>
  );
}

function MarketingHomeInner() {
  const reduce = useReducedMotion();
  const { brandName, footer } = usePublicBrand();
  const whoWeAreDescription = `${brandName} is a digital consulting / systems advisory team: we help you see the real state of your site and processes, find bottlenecks, and build a prioritized plan—from quick wins to durable systemic change.`;

  return (
      <div data-testid="marketing-home">
        <MarketingSection className="relative">
          <div
            className="pointer-events-none absolute -inset-x-4 -top-4 bottom-0 -z-10 overflow-hidden rounded-[var(--radius-2xl)] sm:-inset-x-6 sm:-top-6"
            aria-hidden
          >
          </div>

          <div className="relative grid gap-12 pt-2 lg:grid-cols-12 lg:gap-10 lg:items-center">
            <div className="lg:col-span-9">
              <p
                className="mb-4 inline-flex items-center rounded-full border px-3.5 py-1.5 text-xs font-semibold uppercase"
                style={{
                  backgroundColor: 'color-mix(in oklab, var(--bg-surface) 92%, transparent)',
                  borderColor: 'color-mix(in oklab, var(--glc-blue) 22%, var(--border-subtle))',
                  color: 'var(--glc-blue-deeper)',
                  letterSpacing: '0.07em',
                  boxShadow: 'var(--shadow-xs)',
                }}
              >
                {brandName} · audit-first
              </p>
              <h1
                className="font-display text-[clamp(2rem,5.4vw,3.35rem)] font-bold leading-[1.03] tracking-tight"
                style={{ color: 'var(--text-primary)' }}
              >
                We find what slows growth across your digital stack: audits, bottlenecks, automation, and a{' '}
                <span
                  style={{
                    backgroundImage: 'linear-gradient(135deg, var(--glc-blue-dark) 0%, var(--glc-blue-deeper) 100%)',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    color: 'transparent',
                  }}
                >
                  roadmap with next steps
                </span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-relaxed sm:text-lg" style={{ color: 'var(--text-secondary)' }}>
                Site, processes, integrations, and communications in one view. No fluff: what is broken, what to fix first,
                what to automate, and which move will move the needle.
              </p>
              <p
                className="mt-4 max-w-xl text-sm leading-relaxed sm:text-[0.95rem]"
                style={{ color: 'var(--text-tertiary)' }}
              >
                Built for founders and operating teams that need a clear next move, not another generic audit PDF.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <motion.div whileHover={reduce ? undefined : { y: -2 }} transition={{ duration: 0.2 }}>
                  <Link
                    to="/brief"
                    data-testid="hero-cta-brief"
                    className="group inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-semibold transition-[box-shadow,transform] duration-200 sm:w-auto"
                    style={{
                      background: 'var(--gradient-brand)',
                      color: 'var(--primary-foreground)',
                      boxShadow: '0 10px 30px rgba(28,189,255,0.3)',
                      textDecoration: 'none',
                    }}
                  >
                    Get your recommended path
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </motion.div>
                <motion.div whileHover={reduce ? undefined : { y: -2 }} transition={{ duration: 0.2 }}>
                  <Link
                    to="/snapshot"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-semibold transition-[border-color,box-shadow,transform] duration-200 sm:w-auto"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--border-default)',
                      color: 'var(--text-primary)',
                      textDecoration: 'none',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                  >
                    Check how systems see your site
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </motion.div>
              </div>
              <p className="mt-3 max-w-xl text-xs leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                Snapshot is the first visibility check: what automated systems can read on your public pages, what they miss, and where clarity drops.
              </p>
              <ul className="mt-10 flex flex-wrap gap-x-8 gap-y-2 text-sm" style={{ color: 'var(--text-tertiary)' }}>
                {['Clear package boundaries', 'Handoff-ready report', 'Prioritized next actions'].map(line => (
                  <li key={line} className="flex items-center gap-2">
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: 'var(--glc-green)', boxShadow: '0 0 0 3px var(--glc-green-muted)' }}
                      aria-hidden
                    />
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </MarketingSection>

        <MarketingSection className="mt-20 border-t border-[var(--border-subtle)] pt-16 sm:mt-24 sm:pt-20" delay={0.05}>
          <SectionHeading
            variant="rail"
            title={marketingHomeCopy.whoWeAreTitle}
            description={whoWeAreDescription}
          />
        </MarketingSection>

        <MarketingSection className="mt-16 sm:mt-20" delay={0.08}>
          <SectionHeading variant="minimal" title={marketingHomeCopy.whatWeDoTitle} />
          <ul
            className="mt-8 max-w-3xl divide-y border-y text-sm leading-relaxed"
            style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
          >
            {marketingHomeCopy.whatWeDoLines.map(line => (
              <li key={line} className="flex gap-3 py-4 first:pt-0 last:pb-0">
                <CheckCircle className="mt-0.5 h-5 w-5 shrink-0" style={{ color: 'var(--glc-green-dark)' }} weight="fill" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </MarketingSection>

        <MarketingSection className="mt-24" delay={0.1}>
          <SectionHeading
            title={marketingHomeCopy.chooseEntryTitle}
            description={marketingHomeCopy.chooseEntryDescription}
          />
          <div className="mt-10 rounded-[var(--radius-2xl)] border p-3 sm:p-4" style={{ borderColor: 'var(--border-subtle)' }}>
            <DecisionPath />
          </div>
        </MarketingSection>

        <MarketingSection className="mt-24" delay={0.14}>
          <SectionHeading
            variant="rail"
            title={marketingHomeCopy.coveragePackagesTitle}
            description={marketingHomeCopy.coveragePackagesDescription}
          />
          <div className="mt-10 rounded-[var(--radius-2xl)] border p-3 sm:p-4" style={{ borderColor: 'var(--border-subtle)' }}>
            <AuditCompare compact />
          </div>
        </MarketingSection>

        <MarketingSection className="mt-20 sm:mt-24" delay={0.15}>
          <SectionHeading
            variant="minimal"
            title="What you actually get"
            description="Every paid package is designed for execution, not just diagnosis."
          />
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              {
                title: 'Decision-ready diagnosis',
                body: 'The report shows what is blocking growth now, what is secondary, and what can wait.',
              },
              {
                title: 'Priority roadmap',
                body: 'You get an impact/effort sequence so teams know exactly what to do first.',
              },
              {
                title: 'Transparent scope',
                body: 'Covered and not-analyzed domains are explicit, so expectations stay realistic.',
              },
            ].map(item => (
              <article
                key={item.title}
                className="glc-card p-5 sm:p-6"
                style={{ borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-card)' }}
              >
                <h3 className="font-display text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {item.body}
                </p>
              </article>
            ))}
          </div>
        </MarketingSection>

        <MarketingSection className="mt-16 sm:mt-20" delay={0.155}>
          <div
            className="rounded-[var(--radius-2xl)] border p-5 sm:p-6"
            style={{
              borderColor: 'var(--border-subtle)',
              background: 'linear-gradient(145deg, color-mix(in oklab, var(--bg-surface) 88%, var(--bg-muted)) 0%, var(--bg-surface) 100%)',
            }}
          >
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
              Why teams trust this flow
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {[
                'Package scope is explicit before delivery starts.',
                'Reports are structured for real implementation handoff.',
                'Entry path is flexible: Snapshot, Brief, or direct package selection.',
              ].map(line => (
                <div
                  key={line}
                  className="rounded-xl border px-4 py-3 text-sm leading-relaxed"
                  style={{ borderColor: 'var(--border-subtle)', background: 'color-mix(in oklab, var(--bg-surface) 94%, white)' }}
                >
                  {line}
                </div>
              ))}
            </div>
          </div>
        </MarketingSection>

        <MarketingSection className="mt-20 sm:mt-24" delay={0.16}>
          <SectionHeading
            variant="minimal"
            title={marketingHomeCopy.questionsTitle}
            description={marketingHomeCopy.questionsDescription}
          />
          <div className="mt-6 max-w-3xl">
            <Accordion type="single" collapsible className="w-full">
              {marketingHomeCopy.faqPreview.map((item, i) => (
                <AccordionItem key={item.q} value={`p-${i}`}>
                  <AccordionTrigger className="text-left text-base font-semibold">{item.q}</AccordionTrigger>
                  <AccordionContent className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            <Link
              to="/faq"
              className="group mt-5 inline-flex items-center gap-1 text-sm font-semibold transition-colors"
              style={{ color: 'var(--glc-blue)' }}
            >
              All questions and answers
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
          </div>
        </MarketingSection>

        <MarketingSection className="mt-24" delay={0.18}>
          <div
            className="flex flex-col gap-6 overflow-hidden p-6 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:p-8"
            style={{
              borderRadius: 'var(--radius-2xl)',
              background: 'var(--gradient-ink-rich)',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            <div className="max-w-xl">
              <h2
                className="font-display text-xl font-bold tracking-tight sm:text-2xl"
                style={{ color: 'rgba(255,255,255,0.96)' }}
              >
                Already working with us?
              </h2>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.72)' }}>
                Client dashboard: reports, audit status, materials, and recommended actions.
              </p>
            </div>
            <Link
              to={LOGIN_PATH}
              className="group inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-semibold transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5"
              style={{
                background: 'var(--gradient-accent)',
                color: 'var(--primary-foreground)',
                boxShadow: '0 8px 24px rgba(242,79,29,0.28)',
              }}
            >
              Sign in to dashboard
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
          </div>
        </MarketingSection>

        <div className="mt-16">
          <NextStepsCta
            title="What to do next"
            subtitle="If you want a human in the loop—brief or FAQ."
            steps={[
              { to: '/faq', label: 'FAQ', hint: 'Timelines, format, how we work.' },
              { to: '/brief', label: 'Book a brief call', hint: 'We gather context and suggest a route.', primary: true },
              { to: LOGIN_PATH, label: footer.clientSignInLabel, hint: 'For current clients.' },
            ]}
          />
        </div>
      </div>
  );
}
