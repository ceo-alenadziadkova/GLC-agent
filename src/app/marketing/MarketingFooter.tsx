import { Link } from 'react-router';
import { EnvelopeSimple } from '@phosphor-icons/react';
import { LOGIN_PATH, MARKETING_LINKS } from './marketing-nav';
import { usePublicBrand } from './PublicBrandContext';

function supportMailtoHref(email: string): string {
  return `mailto:${email}`;
}

export function MarketingFooter() {
  const { footer, supportEmail } = usePublicBrand();
  const mailHref = supportEmail.trim() ? supportMailtoHref(supportEmail.trim()) : null;

  return (
    <footer
      className="mt-auto border-t"
      style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'color-mix(in oklab, var(--bg-muted) 55%, var(--bg-canvas))' }}
    >
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
              {footer.brandTitle}
            </p>
            <p className="mt-2 max-w-sm text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {footer.introParagraph}
            </p>
            {mailHref ? (
              <a
                href={mailHref}
                className="mt-4 inline-flex items-center gap-2 text-sm font-medium"
                style={{ color: 'var(--glc-blue)' }}
              >
                <EnvelopeSimple className="h-4 w-4" aria-hidden />
                {supportEmail.trim()}
              </a>
            ) : null}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
              {footer.routesSectionTitle}
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
                  {footer.clientSignInLabel}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
              {footer.nextStepSectionTitle}
            </p>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {footer.nextStepBeforeSnapshot}
              <Link to="/snapshot" className="font-medium underline-offset-2 hover:underline" style={{ color: 'var(--glc-blue)' }}>
                {footer.snapshotLinkLabel}
              </Link>
              {footer.nextStepBetweenSnapshotAndBrief}
              <Link to="/brief" className="font-medium underline-offset-2 hover:underline" style={{ color: 'var(--glc-blue)' }}>
                {footer.briefLinkLabel}
              </Link>
              {footer.nextStepAfterBrief}
            </p>
          </div>
        </div>
        <p className="mt-10 text-center text-xs" style={{ color: 'var(--text-quaternary)' }}>
          {footer.legalLine}
        </p>
      </div>
    </footer>
  );
}
