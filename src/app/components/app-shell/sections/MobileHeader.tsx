import { Bell, List } from '@phosphor-icons/react';
import { Link } from 'react-router';
import { ThemeToggle } from '../../ThemeToggle';
import { GlcLogo } from '../../GlcLogo';
import { APP_SHELL_UI_POLICY } from '../config/app-shell-ui-policy';
import type { AppShellHeaderProps } from './types';

export function MobileHeader({
  title,
  subtitle,
  actions,
  isSmUp,
  unreadCount,
  onOpenNotifications,
  onOpenMobileMenu,
  shellCopy,
}: AppShellHeaderProps) {
  return (
    <header
      className="sm:hidden flex shrink-0 items-center gap-2 border-b border-[var(--border-subtle)] pb-[var(--space-2)] shadow-[var(--shadow-xs)] glc-safe-pad-x glc-safe-pad-t"
      aria-hidden={title ? isSmUp : undefined}
      style={{
        minHeight: 'var(--glc-mobile-header-height)',
      }}
    >
      <Link to="/" className="inline-flex items-center flex-shrink-0" aria-label={shellCopy.aria.home}>
        <GlcLogo variant="auto" className="h-9" />
      </Link>
      <div className="flex-1 min-w-0">
        {title ? (
          <>
            <h1
              className="m-0 truncate [font-family:var(--font-display)] text-[length:var(--text-base)] font-semibold leading-[var(--leading-tight)] tracking-[var(--tracking-tight)] text-[var(--text-primary)]"
            >
              {title}
            </h1>
            {subtitle ? (
              <p className="m-0 mt-0.5 truncate text-[length:var(--text-xs)] tracking-[var(--tracking-subtitle)] text-[var(--text-tertiary)]">
                {subtitle}
              </p>
            ) : null}
          </>
        ) : (
          <span className="text-[length:var(--text-sm)] text-[var(--text-tertiary)]">
            {shellCopy.mobileHeader.glcShortBrand}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {actions ? (
          <div className="flex items-center max-w-[40vw] overflow-hidden [&_a]:text-xs [&_a]:px-2 [&_a]:py-2 [&_a]:min-h-[var(--glc-touch-target-min)] [&_button]:min-h-[var(--glc-touch-target-min)]">
            {actions}
          </div>
        ) : null}
        <button
          type="button"
          className="relative inline-flex glc-touch-target items-center justify-center rounded-lg border-0 bg-[var(--bg-muted)] text-[var(--text-secondary)]"
          onClick={onOpenNotifications}
          aria-label={shellCopy.aria.openNotifications}
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 ? (
            <span
              className="absolute right-1 top-1 flex h-[length:var(--space-4-5)] min-w-[length:var(--space-4-5)] items-center justify-center rounded-full bg-[var(--glc-blue)] px-1 text-[length:var(--text-2xs)] font-bold text-[var(--primary-foreground)]"
            >
              {unreadCount > APP_SHELL_UI_POLICY.mobile.unreadBadgeCap
                ? `${APP_SHELL_UI_POLICY.mobile.unreadBadgeCap}+`
                : unreadCount}
            </span>
          ) : null}
        </button>
        <div className="glc-touch-target flex items-center justify-center">
          <ThemeToggle />
        </div>
        <button
          type="button"
          className="glc-touch-target rounded-lg border-0 bg-[var(--bg-muted)] text-[var(--text-secondary)]"
          onClick={onOpenMobileMenu}
          aria-label={shellCopy.aria.openMenu}
        >
          <List className="w-5 h-5" weight="bold" />
        </button>
      </div>
    </header>
  );
}

