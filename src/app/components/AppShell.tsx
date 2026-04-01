import { NavLink, useLocation } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  Briefcase, SquaresFour, Pulse, FileText, Flask,
  GearSix, Bell, MagnifyingGlass, Lightning, SignOut,
  HouseSimple, ClipboardText, Eye, Tray,
} from '@phosphor-icons/react';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import Logo from '../assets/logo.svg';

function useCurrentAuditId(): string | null {
  const { pathname } = useLocation();
  // Extract audit ID from paths like /audit/:id, /pipeline/:id, /reports/:id, /strategy/:id
  const match = pathname.match(/^\/(audit|pipeline|reports|strategy)\/([a-f0-9-]+)/);
  return match ? match[2] : null;
}

function buildConsultantNav(auditId: string | null) {
  return [
    { to: '/dashboard',                          icon: SquaresFour,  label: 'Dashboard', badge: null },
    { to: '/admin/requests',                     icon: Tray,         label: 'Request queue', badge: null },
    { to: auditId ? `/audit/${auditId}` : null,  icon: Briefcase,    label: 'Audit Workspace',  badge: null },
    { to: auditId ? `/pipeline/${auditId}` : null, icon: Pulse,      label: 'Pipeline',         badge: null },
    { to: auditId ? `/reports/${auditId}` : null, icon: FileText,    label: 'Reports',          badge: null },
    { to: auditId ? `/strategy/${auditId}` : null,icon: Flask,       label: 'Strategy Lab',     badge: null },
  ];
}

function buildClientNav(auditId: string | null) {
  return [
    { to: '/portal',                                        icon: HouseSimple,   label: 'My Portal',    badge: null },
    { to: '/portal/request',                               icon: ClipboardText, label: 'New Request',  badge: null },
    { to: auditId ? `/portal/audit/${auditId}` : null,     icon: Eye,           label: 'Audit Status', badge: null },
  ];
}

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function AppShell({ children, title, subtitle, actions }: AppShellProps) {
  const location = useLocation();
  const { user, signOut, isAuthenticated } = useAuth();
  const { isConsultant, isClient, roleDisplayName } = useProfile();
  const auditId = useCurrentAuditId();

  const NAV = isClient ? buildClientNav(auditId) : buildConsultantNav(auditId);

  const sectionLabel = isClient ? 'CLIENT WORKSPACE' : 'ADMIN WORKSPACE';

  return (
    <div className="h-screen flex overflow-hidden" style={{ backgroundColor: 'var(--bg-canvas)' }}>
      {/* ── Sidebar ─────────────────────────────── */}
      <aside
        className="w-[216px] flex-shrink-0 flex flex-col overflow-hidden relative"
        style={{
          background: 'var(--gradient-ink-rich)',
          borderRight: '1px solid rgba(255,255,255,0.04)',
        }}
      >
        {/* Mesh glow overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'var(--mesh-ink)',
            opacity: 0.5,
          }}
        />

        {/* Logo */}
        <div
          className="relative flex items-center gap-2 px-4 pt-5 pb-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
        >
          <img
            src={Logo}
            alt="GLC Audit Platform"
            className="h-12 w-auto"
          />
        </div>

        {/* Search — consultant only */}
        {(isConsultant || !isClient) && (
          <div className="relative px-3 py-3">
            <button
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg"
              style={{
                backgroundColor: 'rgba(255,255,255,0.05)',
                color: 'rgba(255,255,255,0.30)',
                fontSize: 'var(--text-xs)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 'var(--radius-md)',
                transition: 'background var(--ease-fast), border-color var(--ease-fast)',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.08)';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.12)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.05)';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)';
              }}
            >
              <MagnifyingGlass className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="flex-1 text-left">Search...</span>
              <span
                className="px-1 py-0.5 rounded"
                style={{
                  fontSize: '9px',
                  fontFamily: 'var(--font-mono)',
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.35)',
                  letterSpacing: '0',
                }}
              >
                ⌘K
              </span>
            </button>
          </div>
        )}

        {/* Nav */}
        <nav className="relative flex-1 px-2 pb-2 space-y-0.5 overflow-y-auto">
          <div
            className="px-2 py-1.5"
            style={{ color: 'rgba(255,255,255,0.20)', fontSize: '9px', letterSpacing: '0.14em', fontWeight: 700 }}
          >
            {sectionLabel}
          </div>

          {NAV.map(({ to, icon: Icon, label, badge }) => {
            if (!to) {
              return (
                <div
                  key={label}
                  className="relative flex items-center gap-2.5 px-2.5 py-2 rounded-lg"
                  style={{ color: 'rgba(255,255,255,0.20)', fontSize: 'var(--text-sm)', cursor: 'not-allowed' }}
                >
                  <Icon className="relative w-4 h-4 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.15)' }} />
                  <span className="relative flex-1 truncate">{label}</span>
                </div>
              );
            }
            const active = location.pathname === to ||
              (to !== '/dashboard' && to !== '/portal' && to !== '/admin/requests' && location.pathname.startsWith(to.split('/').slice(0, 2).join('/')));
            return (
              <NavLink
                key={to}
                to={to}
                className="relative flex items-center gap-2.5 px-2.5 py-2 rounded-lg no-underline transition-all"
                style={{
                  color: active ? '#fff' : 'rgba(255,255,255,0.46)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: active ? 500 : 400,
                  transition: 'color var(--ease-fast)',
                }}
              >
                {/* Active background */}
                {active && (
                  <motion.span
                    layoutId="nav-bg"
                    className="absolute inset-0 rounded-lg"
                    style={{
                      background: 'linear-gradient(90deg, rgba(28,189,255,0.15) 0%, rgba(28,189,255,0.06) 100%)',
                      border: '1px solid rgba(28,189,255,0.18)',
                    }}
                    transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
                  />
                )}
                {/* Active left glow line */}
                {active && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 rounded-full"
                    style={{
                      height: '60%',
                      background: 'var(--glc-blue)',
                      boxShadow: '0 0 8px rgba(28,189,255,0.7)',
                    }}
                  />
                )}

                <Icon
                  className="relative w-4 h-4 flex-shrink-0"
                  style={{ color: active ? 'var(--glc-blue)' : 'rgba(255,255,255,0.38)' }}
                />
                <span className="relative flex-1 truncate">{label}</span>
                {badge && (
                  <span
                    className="relative text-xs px-1.5 py-0.5 rounded-full font-semibold tabular-nums"
                    style={{
                      backgroundColor: active ? 'rgba(28,189,255,0.22)' : 'rgba(255,255,255,0.08)',
                      color: active ? 'var(--glc-blue)' : 'rgba(255,255,255,0.38)',
                      fontSize: '10px',
                      border: active ? '1px solid rgba(28,189,255,0.25)' : '1px solid transparent',
                    }}
                  >
                    {badge}
                  </span>
                )}
              </NavLink>
            );
          })}

          {/* Divider */}
          <div className="mx-2 my-2" style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />

          {/* Quick action — consultant: New Audit; client: Submit Request */}
          {isClient ? (
            <NavLink
              to="/portal/request"
              className="relative flex items-center gap-2.5 px-2.5 py-2 rounded-lg no-underline"
              style={{
                color: 'rgba(255,255,255,0.38)',
                fontSize: 'var(--text-sm)',
                transition: 'color var(--ease-fast), background var(--ease-fast)',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(28,189,255,0.10)';
                (e.currentTarget as HTMLElement).style.color = 'var(--glc-blue)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.38)';
              }}
            >
              <ClipboardText className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--glc-blue)' }} />
              <span>Submit Request</span>
            </NavLink>
          ) : (
            <NavLink
              to="/audit/new"
              className="relative flex items-center gap-2.5 px-2.5 py-2 rounded-lg no-underline"
              style={{
                color: 'rgba(255,255,255,0.38)',
                fontSize: 'var(--text-sm)',
                transition: 'color var(--ease-fast), background var(--ease-fast)',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(242,79,29,0.10)';
                (e.currentTarget as HTMLElement).style.color = 'var(--glc-orange-light)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.38)';
              }}
            >
              <Lightning className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--glc-orange)' }} />
              <span>New Audit</span>
            </NavLink>
          )}
        </nav>

        {/* Bottom */}
        <div
          className="relative px-2 py-2 space-y-0.5"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
        >
          {[
            { icon: Bell,    label: 'Notifications' },
            { icon: GearSix, label: 'Settings'       },
          ].map(({ icon: I, label }) => (
            <button
              key={label}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all"
              style={{ color: 'rgba(255,255,255,0.30)', borderRadius: 'var(--radius-md)' }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.05)';
                (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.65)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.30)';
              }}
            >
              <I className="w-3.5 h-3.5" />{label}
            </button>
          ))}

          {/* Avatar */}
          {isAuthenticated && user && (
            <div
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg mt-1 cursor-pointer"
              style={{
                backgroundColor: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{
                  background: 'var(--gradient-brand)',
                  color: 'var(--glc-ink)',
                  boxShadow: '0 0 8px rgba(28,189,255,0.30)',
                }}
              >
                {(user.email || 'U')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium leading-none" style={{ color: 'rgba(255,255,255,0.85)' }}>
                  {user.email?.split('@')[0] || 'User'}
                </div>
                <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.28)', marginTop: 3, letterSpacing: '0.03em' }}>
                  {roleDisplayName ?? (isClient ? 'Client' : 'Admin')}
                </div>
              </div>
              <button
                onClick={signOut}
                className="flex-shrink-0"
                style={{ color: 'rgba(255,255,255,0.30)' }}
                title="Sign out"
              >
                <SignOut className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main area ───────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {(title || actions) && (
          <header
            className="flex-shrink-0 flex items-center justify-between px-7"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderBottom: '1px solid var(--border-subtle)',
              minHeight: '56px',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            <div>
              {title && (
                <h1
                  style={{
                    color: 'var(--text-primary)',
                    fontSize: 'var(--text-base)',
                    fontWeight: 600,
                    letterSpacing: 'var(--tracking-tight)',
                    fontFamily: 'var(--font-display)',
                  }}
                >
                  {title}
                </h1>
              )}
              {subtitle && (
                <p
                  style={{
                    color: 'var(--text-tertiary)',
                    fontSize: 'var(--text-xs)',
                    marginTop: 2,
                    letterSpacing: '0.01em',
                  }}
                >
                  {subtitle}
                </p>
              )}
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </header>
        )}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
