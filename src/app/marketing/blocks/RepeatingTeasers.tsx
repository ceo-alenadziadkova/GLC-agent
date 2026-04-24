import { Link } from 'react-router';
import { Binoculars, FileText, Star } from '@phosphor-icons/react';
import { cn } from '../../components/ui/utils';

const TEASER_FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--glc-blue)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-canvas)]';

function TeaserCard({
  icon: Icon,
  title,
  body,
  to,
  cta,
}: {
  icon: typeof Binoculars;
  title: string;
  body: string;
  to: string;
  cta: string;
}) {
  return (
    <div className="ds-marketing-teaser-card">
      <Icon className="h-8 w-8 text-[var(--text-primary)]" aria-hidden />
      <h3 className="mt-4 font-display text-xl font-semibold tracking-tight text-[var(--text-primary)]/90">
        {title}
      </h3>
      <p className="ds-marketing-text-muted mt-3 flex-1 text-sm leading-relaxed">
        {body}
      </p>
      <Link to={to} className={cn('mt-6 inline-flex text-sm font-semibold text-[var(--glc-blue)]', TEASER_FOCUS)}>
        {cta}
      </Link>
    </div>
  );
}

export function SnapshotTeaser() {
  return (
    <TeaserCard
      icon={Binoculars}
      title="Not sure? Start with Snapshot"
      body="A quick read on public site signals—low commitment, so you can see where to focus first."
      to="/snapshot"
      cta="Go to Snapshot"
    />
  );
}

export function DiscoveryTeaser() {
  return (
    <TeaserCard
      icon={Star}
      title="No site or fuzzy scope?"
      body="Discovery helps shape a digital structure and the next step without pressure or vague tech promises."
      to="/discovery"
      cta="Discovery path"
    />
  );
}

export function BriefTeaser() {
  return (
    <TeaserCard
      icon={FileText}
      title="Want a specialist involved?"
      body="Short brief: you share context—we suggest a sensible route (Snapshot, Starter, Pro, or Complete)."
      to="/brief"
      cta="Fill out the brief"
    />
  );
}
