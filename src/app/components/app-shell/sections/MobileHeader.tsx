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
      className="sm:hidden flex-shrink-0 flex items-center gap-2 border-b glc-safe-pad-x glc-safe-pad-t"
      aria-hidden={title ? isSmUp : undefined}
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-subtle)',
        minHeight: 'var(--glc-mobile-header-height)',
        boxShadow: 'var(--shadow-xs)',
        paddingBottom: 'var(--space-2)',
      }}
    >
      <Link to="/" className="inline-flex items-center flex-shrink-0" aria-label={shellCopy.aria.home}>
        <GlcLogo variant="auto" className="h-9" />
      </Link>
      <div className="flex-1 min-w-0">
        {title ? (
          <>
            <h1
              className="truncate m-0"
              style={{
                color: 'var(--text-primary)',
                fontSize: 'var(--text-base)',
                fontWeight: 600,
                letterSpacing: 'var(--tracking-tight)',
                fontFamily: 'var(--font-display)',
                lineHeight: 'var(--leading-tight)',
              }}
            >
              {title}
            </h1>
            {subtitle ? (
              <p
                className="truncate m-0 mt-0.5"
                style={{
                  color: 'var(--text-tertiary)',
                  fontSize: 'var(--text-xs)',
                  letterSpacing: '0.01em',
                }}
              >
                {subtitle}
              </p>
            ) : null}
          </>
        ) : (
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)' }}>
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
          className="relative glc-touch-target rounded-lg border-0 inline-flex items-center justify-center"
          style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-secondary)' }}
          onClick={onOpenNotifications}
          aria-label={shellCopy.aria.openNotifications}
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 ? (
            <span
              className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center"
              style={{
                backgroundColor: 'var(--glc-blue)',
                color: 'var(--primary-foreground)',
              }}
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
          className="glc-touch-target rounded-lg border-0"
          style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-secondary)' }}
          onClick={onOpenMobileMenu}
          aria-label={shellCopy.aria.openMenu}
        >
          <List className="w-5 h-5" weight="bold" />
        </button>
      </div>
    </header>
  );
}

