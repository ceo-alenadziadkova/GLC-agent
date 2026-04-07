import { Link } from 'react-router';
import { Binoculars, FileText, Star } from '@phosphor-icons/react';

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
    <div
      className="glc-card flex h-full flex-col p-5 sm:p-6"
      style={{ borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-card)' }}
    >
      <Icon className="h-8 w-8" style={{ color: 'var(--glc-blue)' }} aria-hidden />
      <h3 className="mt-3 font-display text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
        {title}
      </h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        {body}
      </p>
      <Link
        to={to}
        className="mt-4 inline-flex text-sm font-semibold"
        style={{ color: 'var(--glc-orange)' }}
      >
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
      body="Short brief: you share context—we suggest a sensible route (Snapshot, Express, or full audit)."
      to="/brief"
      cta="Fill out the brief"
    />
  );
}
