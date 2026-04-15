import { Link } from 'react-router';
import { LOGIN_PATH, MARKETING_LINKS } from './marketing-nav';
import { usePublicBrand } from './PublicBrandContext';
import { WORKSPACE_PAGE_COPY } from '../config/workspace-page-copy';

function supportMailtoHref(email: string): string {
  return `mailto:${email}`;
}

export function MarketingFooter() {
  const { footer, supportEmail } = usePublicBrand();
  const mailHref = supportEmail.trim() ? supportMailtoHref(supportEmail.trim()) : null;
  const compactLinks = MARKETING_LINKS.filter(link => ['/', '/faq'].includes(link.to));
  const footerNavLabel = WORKSPACE_PAGE_COPY.marketingLayout.footerNavAriaLabel;

  return (
    <footer
      className="mt-auto border-t"
      style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'color-mix(in oklab, var(--bg-muted) 55%, var(--bg-canvas))' }}
    >
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between sm:gap-10">
          <div className="min-w-0 text-center sm:max-w-md sm:text-left">
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {footer.brandTitle}
            </p>
            {mailHref ? (
              <a
                href={mailHref}
                className="mt-3 inline-flex min-h-10 items-center text-sm font-medium"
                style={{ color: 'var(--glc-blue)' }}
              >
                {supportEmail.trim()}
              </a>
            ) : null}
          </div>

          <nav aria-label={footerNavLabel} className="min-w-0 sm:shrink-0">
            <ul className="flex flex-col items-center gap-1 sm:items-end">
              {compactLinks.map(({ to, label }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="inline-flex min-h-10 items-center px-1 py-1.5 text-sm"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  to={LOGIN_PATH}
                  className="inline-flex min-h-10 items-center px-1 py-1.5 text-sm"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {footer.clientSignInLabel}
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <p
          className="mt-8 border-t pt-6 text-center text-xs leading-relaxed sm:mt-10 sm:pt-7"
          style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-quaternary)' }}
        >
          {footer.legalLine}
        </p>
      </div>
    </footer>
  );
}
