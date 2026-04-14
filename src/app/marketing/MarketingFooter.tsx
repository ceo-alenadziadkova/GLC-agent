import { Link } from 'react-router';
import { LOGIN_PATH, MARKETING_LINKS } from './marketing-nav';
import { usePublicBrand } from './PublicBrandContext';

function supportMailtoHref(email: string): string {
  return `mailto:${email}`;
}

export function MarketingFooter() {
  const { footer, supportEmail } = usePublicBrand();
  const mailHref = supportEmail.trim() ? supportMailtoHref(supportEmail.trim()) : null;
  const compactLinks = MARKETING_LINKS.filter(link => ['/', '/faq'].includes(link.to));

  return (
    <footer
      className="mt-auto border-t"
      style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'color-mix(in oklab, var(--bg-muted) 55%, var(--bg-canvas))' }}
    >
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
        <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
          {mailHref ? <a href={mailHref} style={{ color: 'var(--glc-blue)' }}>{supportEmail.trim()}</a> : null}
          <span>Palma de Mallorca</span>
          {compactLinks.map(({ to, label }) => (
            <Link key={to} to={to} style={{ color: 'var(--text-secondary)' }}>{label}</Link>
          ))}
          <Link to={LOGIN_PATH} style={{ color: 'var(--text-secondary)' }}>{footer.clientSignInLabel}</Link>
          <span style={{ color: 'var(--text-quaternary)' }}>{footer.legalLine}</span>
        </p>
      </div>
    </footer>
  );
}
