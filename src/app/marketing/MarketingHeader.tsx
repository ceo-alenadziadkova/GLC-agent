import { useEffect, useRef } from 'react';
import { Link, NavLink } from 'react-router';
import { List, X } from '@phosphor-icons/react';
import { GlcLogo } from '../components/GlcLogo';
// import { ThemeToggle } from '../components/ThemeToggle';
import { LOGIN_PATH, MARKETING_LINKS } from './marketing-nav';
import { cn } from '../components/ui/utils';
import { usePublicBrand } from './PublicBrandContext';
import { useScrolled } from '../hooks/useScrolled';
import { WORKSPACE_PAGE_COPY } from '../config/workspace-page-copy';

export function MarketingHeader({
  mobileNavOpen: open,
  onMobileNavOpenChange: setOpen,
}: {
  mobileNavOpen: boolean;
  onMobileNavOpenChange: (open: boolean) => void;
}) {
  const scrolled = useScrolled();
  const { footer } = usePublicBrand();
  const navCopy = WORKSPACE_PAGE_COPY.marketingLayout;
  const briefLink = MARKETING_LINKS.find(link => link.to === '/brief');
  const menuPanelRef = useRef<HTMLDivElement | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const primaryLinks = MARKETING_LINKS.filter(link =>
    ['/', '/snapshot', '/starter', '/pro', '/complete', '/discovery'].includes(link.to),
  );

  useEffect(() => {
    if (!open) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const menuButtonEl = menuButtonRef.current;

    const focusableSelector =
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';
    const panel = menuPanelRef.current;
    const focusable = panel?.querySelectorAll<HTMLElement>(focusableSelector);
    focusable?.[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        return;
      }

      if (event.key !== 'Tab') return;
      const nodes = panel?.querySelectorAll<HTMLElement>(focusableSelector);
      if (!nodes || nodes.length === 0) return;

      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = originalOverflow;
      menuButtonEl?.focus();
    };
  }, [open, setOpen]);

  return (
    <header
      className="sticky top-0 z-50 border-b ds-marketing-header-shell"
      data-scrolled={scrolled ? 'true' : 'false'}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link
          to="/"
          className="flex min-w-0 shrink-0 items-center gap-2"
          onClick={() => setOpen(false)}
          aria-label={footer.brandTitle}
        >
          <GlcLogo className="h-8 sm:h-9" />
        </Link>

        <nav className="hidden lg:flex lg:flex-1 lg:justify-center" aria-label={navCopy.primaryNavAriaLabel}>
          <ul className="flex flex-wrap items-center justify-center gap-1">
            {primaryLinks.filter(l => l.to !== '/').map(({ to, label }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  className={({ isActive }) =>
                    cn(
                      'rounded-lg px-3 py-1.5 text-sm font-medium transition-[color,background-color,box-shadow]',
                      isActive
                        ? 'bg-[var(--bg-muted)] text-[var(--text-primary)] shadow-[var(--shadow-sm)]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
                    )
                  }
                >
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {/* <ThemeToggle /> */}
          {/* TODO(ds): Spec and implement dedicated marketing-header CTA appearance in the design system (Brief link). */}
          <Link
            to={briefLink?.to ?? '/brief'}
            className="ds-marketing-header-brief-cta hidden rounded-lg px-3 py-2 text-sm font-semibold sm:inline-flex"
          >
            {briefLink?.label ?? footer.briefLinkLabel}
          </Link>
          {/* TODO(ds): Spec and implement dedicated marketing-header CTA appearance in the design system (client sign-in link). */}
          <Link
            to={LOGIN_PATH}
            className="ds-marketing-header-signin-link hidden rounded-lg px-3 py-2 text-sm font-semibold sm:inline-flex"
          >
            {footer.clientSignInLabel}
          </Link>
          <button
            type="button"
            ref={menuButtonRef}
            className="ds-marketing-header-menu-button inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg lg:hidden"
            aria-expanded={open}
            aria-controls="marketing-mobile-menu"
            aria-haspopup="dialog"
            aria-label={open ? navCopy.mobileNavCloseAriaLabel : navCopy.mobileNavOpenAriaLabel}
            onClick={() => setOpen(!open)}
          >
            {open ? <X className="h-5 w-5" /> : <List className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div
          id="marketing-mobile-menu"
          ref={menuPanelRef}
          role="dialog"
          aria-modal="true"
          aria-label={navCopy.mobileNavDialogAriaLabel}
          className="border-t lg:hidden ds-marketing-header-popover"
        >
          <ul className="mx-auto flex max-w-6xl flex-col gap-0.5 px-4 py-3">
            {MARKETING_LINKS.map(({ to, label }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex min-h-11 items-center rounded-lg px-3 py-2 text-sm font-medium ds-marketing-header-link-primary',
                      isActive ? 'bg-[var(--bg-muted)]' : '',
                    )
                  }
                >
                  {label}
                </NavLink>
              </li>
            ))}
            <li>
              <Link
                to={LOGIN_PATH}
                onClick={() => setOpen(false)}
                className="flex min-h-11 items-center rounded-lg px-3 py-2 text-sm font-semibold ds-text-brand"
                
              >
                {footer.clientSignInLabel}
              </Link>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
