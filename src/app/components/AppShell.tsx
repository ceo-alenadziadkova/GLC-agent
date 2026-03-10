import { NavLink, useLocation } from 'react-router';
import {
  Briefcase, LayoutGrid, Activity, FileText, FlaskConical,
  Globe, Settings, Bell, Search, ChevronRight
} from 'lucide-react';
import { cn } from '../../lib/utils';

const NAV = [
  { to: '/portfolio', icon: Briefcase,    label: 'Client Portfolio', badge: '12' },
  { to: '/audit',     icon: LayoutGrid,   label: 'Audit Workspace',  badge: null },
  { to: '/pipeline',  icon: Activity,     label: 'Pipeline Monitor', badge: '3'  },
  { to: '/reports',   icon: FileText,     label: 'Reports',          badge: null },
  { to: '/strategy',  icon: FlaskConical, label: 'Strategy Lab',     badge: null },
];

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function AppShell({ children, title, subtitle, actions }: AppShellProps) {
  const location = useLocation();

  return (
    <div className="h-screen flex overflow-hidden" style={{ backgroundColor: 'var(--bg-canvas)' }}>
      {/* ── Sidebar ─────────────────────────────── */}
      <aside
        className="w-[220px] flex-shrink-0 flex flex-col overflow-hidden"
        style={{ backgroundColor: 'var(--glc-ink)', borderRight: '1px solid rgba(255,255,255,0.05)' }}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-2.5 px-4 py-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--glc-blue) 0%, var(--glc-blue-dark) 100%)' }}
          >
            <Globe className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="font-bold text-sm leading-none" style={{ color: '#fff' }}>GLC</div>
            <div
              className="leading-none mt-0.5"
              style={{ color: 'rgba(255,255,255,0.35)', fontSize: '9px', letterSpacing: '0.1em' }}
            >
              AUDIT PLATFORM
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-2.5">
          <button
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md"
            style={{
              backgroundColor: 'rgba(255,255,255,0.05)',
              color: 'rgba(255,255,255,0.35)',
              fontSize: 'var(--text-xs)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <Search className="w-3.5 h-3.5" />
            <span className="flex-1 text-left">Search...</span>
            <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)' }}>⌘K</span>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-1 space-y-0.5 overflow-y-auto">
          <div
            className="px-2 pt-1 pb-1.5"
            style={{ color: 'rgba(255,255,255,0.25)', fontSize: '9px', letterSpacing: '0.12em', fontWeight: 700 }}
          >
            WORKSPACES
          </div>

          {NAV.map(({ to, icon: Icon, label, badge }) => {
            const active = location.pathname.startsWith(to);
            return (
              <NavLink
                key={to}
                to={to}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-medium no-underline transition-all"
                style={{
                  backgroundColor: active ? 'var(--glc-ink-2)' : 'transparent',
                  color: active ? '#fff' : 'rgba(255,255,255,0.52)',
                  borderRadius: 'var(--radius-md)',
                  borderLeft: active ? `2px solid var(--glc-blue)` : '2px solid transparent',
                }}
                onMouseEnter={e => {
                  if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--glc-ink-1)';
                }}
                onMouseLeave={e => {
                  if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                }}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 truncate">{label}</span>
                {badge && (
                  <span
                    className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
                    style={{
                      backgroundColor: active ? 'var(--glc-blue)' : 'rgba(255,255,255,0.10)',
                      color: active ? 'var(--glc-ink)' : 'rgba(255,255,255,0.5)',
                      fontSize: '10px',
                    }}
                  >
                    {badge}
                  </span>
                )}
                {active && <ChevronRight className="w-3 h-3 opacity-40" />}
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="px-2 py-2 space-y-0.5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {[
            { icon: Bell, label: 'Notifications' },
            { icon: Settings, label: 'Settings' },
          ].map(({ icon: I, label }) => (
            <button
              key={label}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors"
              style={{ color: 'rgba(255,255,255,0.38)', borderRadius: 'var(--radius-md)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--glc-ink-1)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
            >
              <I className="w-4 h-4" />{label}
            </button>
          ))}

          {/* Avatar */}
          <div
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-md mt-1"
            style={{ backgroundColor: 'var(--glc-ink-1)' }}
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, var(--glc-blue) 0%, var(--glc-blue-dark) 100%)', color: 'var(--glc-ink)' }}
            >
              A
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-white truncate">Alena D.</div>
              <div className="truncate" style={{ fontSize: '9px', color: 'rgba(255,255,255,0.35)' }}>GLC Tech · Admin</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main area ───────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {(title || actions) && (
          <header
            className="flex-shrink-0 flex items-center justify-between px-7 py-0"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderBottom: '1px solid var(--border-subtle)',
              minHeight: '56px',
            }}
          >
            <div>
              {title && (
                <h1
                  className="text-base font-semibold"
                  style={{ color: 'var(--text-primary)', letterSpacing: 'var(--tracking-tight)' }}
                >
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="text-xs" style={{ color: 'var(--text-tertiary)', marginTop: 1 }}>{subtitle}</p>
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
