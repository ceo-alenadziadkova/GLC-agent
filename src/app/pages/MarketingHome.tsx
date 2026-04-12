import { Link } from 'react-router';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, CaretRight, CheckCircle } from '@phosphor-icons/react';
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
            <div
              className="absolute -left-[15%] top-0 h-[min(420px,70vw)] w-[min(520px,90vw)] rounded-full opacity-90 blur-3xl"
              style={{ background: 'radial-gradient(circle, color-mix(in oklab, var(--glc-blue) 22%, transparent) 0%, transparent 68%)' }}
            />
            <div
              className="absolute -right-[10%] top-1/4 h-[min(320px,55vw)] w-[min(400px,80vw)] rounded-full opacity-80 blur-3xl"
              style={{ background: 'radial-gradient(circle, color-mix(in oklab, var(--glc-green) 18%, transparent) 0%, transparent 65%)' }}
            />
          </div>

          <div className="relative grid gap-12 pt-2 lg:grid-cols-12 lg:gap-10 lg:items-center">
            <div className="lg:col-span-7">
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
                className="font-display text-[clamp(1.9rem,5.2vw,3.15rem)] font-bold leading-[1.06] tracking-tight"
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
              <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <motion.div whileHover={reduce ? undefined : { y: -2 }} transition={{ duration: 0.2 }}>
                  <Link
                    to="/snapshot"
                    data-testid="hero-cta-snapshot"
                    className="group inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-semibold transition-[box-shadow,transform] duration-200 sm:w-auto"
                    style={{
                      background: 'var(--gradient-brand)',
                      color: 'var(--primary-foreground)',
                      boxShadow: '0 8px 28px rgba(28,189,255,0.28)',
                      textDecoration: 'none',
                    }}
                  >
                    Not sure—try Snapshot
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </motion.div>
                <motion.div whileHover={reduce ? undefined : { y: -2 }} transition={{ duration: 0.2 }}>
                  <Link
                    to="/audit"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-semibold transition-[border-color,box-shadow,transform] duration-200 sm:w-auto"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--border-default)',
                      color: 'var(--text-primary)',
                      textDecoration: 'none',
                      boxShadow: 'var(--shadow-xs)',
                    }}
                  >
                    Full audit
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </motion.div>
              </div>
              <ul className="mt-10 flex flex-wrap gap-x-8 gap-y-2 text-sm" style={{ color: 'var(--text-tertiary)' }}>
                {['Eight-domain coverage', 'Prioritized roadmap', 'Automation-ready outputs'].map(line => (
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
            <div className="lg:col-span-5">
              <div
                className="rounded-xl p-6 sm:p-7"
                style={{
                  border: '1px solid var(--border-subtle)',
                  backgroundColor: 'var(--bg-surface)',
                  boxShadow: 'var(--shadow-xs)',
                }}
              >
                <p
                  className="text-xs font-bold uppercase tracking-[0.1em]"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Where to go next
                </p>
                <ul className="mt-5 space-y-0 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {[
                    ['Unsure about format', '/snapshot', 'Snapshot'],
                    ['Need a fast review', '/express-audit', 'Express'],
                    ['Need depth and a roadmap', '/audit', 'Full audit'],
                    ['No site or brief yet', '/discovery', 'Discovery'],
                  ].map(([label, to, cta]) => (
                    <li
                      key={to}
                      className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] py-3.5 first:pt-0 last:border-0 last:pb-0"
                    >
                      <span className="leading-snug">{label}</span>
                      <Link
                        to={to}
                        className="group inline-flex shrink-0 items-center gap-0.5 font-semibold transition-colors"
                        style={{ color: 'var(--glc-blue)' }}
                      >
                        {cta}
                        <CaretRight
                          className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                          aria-hidden
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
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
          <div className="mt-10">
            <DecisionPath />
          </div>
        </MarketingSection>

        <MarketingSection className="mt-24" delay={0.14}>
          <SectionHeading
            variant="rail"
            title={marketingHomeCopy.expressVsFullTitle}
            description={marketingHomeCopy.expressVsFullDescription}
          />
          <div className="mt-10">
            <AuditCompare compact />
          </div>
        </MarketingSection>

        <MarketingSection className="mt-16 border-t border-[var(--border-subtle)] pt-14 sm:mt-20 sm:pt-16" delay={0.15}>
          <div className="grid gap-10 lg:grid-cols-3 lg:gap-12">
            <div className="lg:border-r lg:border-[var(--border-subtle)] lg:pr-10">
              <p className="font-display text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                <Link to="/snapshot" className="transition-colors hover:text-[var(--glc-blue-dark)]">
                  Snapshot
                </Link>
              </p>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {marketingHomeCopy.pillars.snapshot.description}
              </p>
            </div>
            <div className="lg:border-r lg:border-[var(--border-subtle)] lg:pr-10">
              <p className="font-display text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                <Link to="/discovery" className="transition-colors hover:text-[var(--glc-blue-dark)]">
                  Discovery
                </Link>
              </p>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {marketingHomeCopy.pillars.discovery.description}
              </p>
            </div>
            <div>
              <p className="font-display text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                <Link to="/brief" className="transition-colors hover:text-[var(--glc-orange-dark)]">
                  Brief
                </Link>
              </p>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {marketingHomeCopy.pillars.brief.description}
              </p>
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
              { to: '/brief', label: 'Short brief', hint: 'We gather context and suggest a route.', primary: true },
              { to: LOGIN_PATH, label: footer.clientSignInLabel, hint: 'For current clients.' },
            ]}
          />
        </div>
      </div>
  );
}
