import { Link } from 'react-router';
import { LOGIN_PATH, MARKETING_LINKS } from './marketing-nav';
import { usePublicBrand } from './PublicBrandContext';
import { APP_ROUTE_PATHS } from '../config/route-paths';
import { WORKSPACE_PAGE_COPY } from '../config/workspace-page-copy';

function supportMailtoHref(email: string): string {
  return `mailto:${email}`;
}

export function MarketingFooter() {
  const { footer, supportEmail } = usePublicBrand();
  const mailHref = supportEmail.trim() ? supportMailtoHref(supportEmail.trim()) : null;
  const compactLinks = MARKETING_LINKS.filter(link => ['/', '/faq'].includes(link.to));
  const ml = WORKSPACE_PAGE_COPY.marketingLayout;
  const footerNavLabel = ml.footerNavAriaLabel;

  return (
    <footer className="mt-auto border-t ds-marketing-footer-shell">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between sm:gap-10">
          <div className="min-w-0 text-center sm:max-w-md sm:text-left">
            <p className="text-sm font-semibold ds-text-primary" >
              {footer.brandTitle}
            </p>
            {mailHref ? (
              <a
                href={mailHref}
                className="mt-3 inline-flex min-h-10 items-center text-sm font-medium ds-text-brand"
                
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
                    className="inline-flex min-h-10 items-center px-1 py-1.5 text-sm ds-text-secondary"
                    
                  >
                    {label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  to={LOGIN_PATH}
                  className="inline-flex min-h-10 items-center px-1 py-1.5 text-sm ds-text-secondary"
                  
                >
                  {footer.clientSignInLabel}
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <div className="mt-8 space-y-2 border-t pt-6 text-center text-xs leading-relaxed sm:mt-10 sm:pt-7">
          <nav aria-label={ml.footerPoliciesNavAriaLabel}>
            <p className="m-0 flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
              <span className="ds-text-tertiary shrink-0">{ml.footerPoliciesIntro}</span>
              <Link
                to={APP_ROUTE_PATHS.legalTerms}
                className="underline-offset-2 hover:underline ds-text-brand shrink-0"
              >
                {ml.footerLegalTerms}
              </Link>
              <span className="ds-text-quaternary shrink-0" aria-hidden>
                ·
              </span>
              <Link
                to={APP_ROUTE_PATHS.legalPrivacy}
                className="underline-offset-2 hover:underline ds-text-brand shrink-0"
              >
                {ml.footerLegalPrivacy}
              </Link>
              <span className="ds-text-quaternary shrink-0" aria-hidden>
                ·
              </span>
              <Link
                to={APP_ROUTE_PATHS.legalCookies}
                className="underline-offset-2 hover:underline ds-text-brand shrink-0"
              >
                {ml.footerLegalCookies}
              </Link>
              <span className="ds-text-quaternary shrink-0" aria-hidden>
                ·
              </span>
              <Link
                to={APP_ROUTE_PATHS.legalDpa}
                className="underline-offset-2 hover:underline ds-text-brand shrink-0"
              >
                {ml.footerLegalDpa}
              </Link>
              <span className="ds-text-quaternary shrink-0" aria-hidden>
                ·
              </span>
              <Link
                to={APP_ROUTE_PATHS.legalNotice}
                className="underline-offset-2 hover:underline ds-text-brand shrink-0"
              >
                {ml.footerLegalNotice}
              </Link>
            </p>
          </nav>
          <p className="m-0 ds-text-tertiary">
            {ml.footerFaqLead}{' '}
            <Link to={APP_ROUTE_PATHS.faq} className="underline-offset-2 hover:underline ds-text-brand">
              {ml.footerFaqLink}
            </Link>
          </p>
          <p className="m-0 ds-marketing-footer-legal">{footer.legalLine}</p>
        </div>
      </div>
    </footer>
  );
}
