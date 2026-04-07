import { Link } from 'react-router';
import { EnvelopeSimple } from '@phosphor-icons/react';
import { LOGIN_PATH, MARKETING_LINKS } from './marketing-nav';

export function MarketingFooter() {
  return (
    <footer
      className="mt-auto border-t"
      style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'color-mix(in oklab, var(--bg-muted) 55%, var(--bg-canvas))' }}
    >
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
              GLC Tech
            </p>
            <p className="mt-2 max-w-sm text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Audits of digital systems, processes, and your website. Bottlenecks, priorities, automation, and a clear
              roadmap—from diagnosis to implementation.
            </p>
            <a
              href="mailto:contact@glctech.es"
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium"
              style={{ color: 'var(--glc-blue)' }}
            >
              <EnvelopeSimple className="h-4 w-4" aria-hidden />
              contact@glctech.es
            </a>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
              Routes
            </p>
            <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {MARKETING_LINKS.map(({ to, label }) => (
                <li key={to}>
                  <Link to={to} className="transition-colors hover:underline" style={{ color: 'var(--text-secondary)' }}>
                    {label}
                  </Link>
                </li>
              ))}
              <li>
                <Link to={LOGIN_PATH} className="transition-colors hover:underline" style={{ color: 'var(--text-secondary)' }}>
                  Client sign-in
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
              Next step
            </p>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Not sure where to start? Try{' '}
              <Link to="/snapshot" className="font-medium underline-offset-2 hover:underline" style={{ color: 'var(--glc-blue)' }}>
                Snapshot
              </Link>
              . Want a human in the loop—{' '}
              <Link to="/brief" className="font-medium underline-offset-2 hover:underline" style={{ color: 'var(--glc-blue)' }}>
                short brief
              </Link>
              .
            </p>
          </div>
        </div>
        <p className="mt-10 text-center text-xs" style={{ color: 'var(--text-quaternary)' }}>
          Palma de Mallorca · Spain · GLC Tech / GLCTech
        </p>
      </div>
    </footer>
  );
}
