import { createBrowserRouter, Navigate } from 'react-router';
import { Dashboard }        from './pages/Dashboard';
import { NewAudit }         from './pages/NewAudit';
import { AuditWorkspace }   from './pages/AuditWorkspace';
import { PipelineMonitor }  from './pages/PipelineMonitor';
import { ReportViewer }     from './pages/ReportViewer';
import { StrategyLab }      from './pages/StrategyLab';
import { Login }            from './pages/Login';
import { IntakeBrief }       from './pages/IntakeBrief';
import { ClientPortal }     from './pages/ClientPortal';
import { ClientAuditView }  from './pages/ClientAuditView';
import { AdminRequestQueue } from './pages/AdminRequestQueue';
import { RootEntry }        from './components/RootEntry';
import { SnapshotPage }     from './pages/SnapshotPage';
import { ExpressAuditPage } from './pages/ExpressAuditPage';
import { FullAuditPage }    from './pages/FullAuditPage';
import { PublicBriefPage }  from './pages/PublicBriefPage';
import { FaqPage }          from './pages/FaqPage';
import { DiscoveryPublicPage } from './pages/DiscoveryPublicPage';
import { DiscoveryQueue }   from './pages/DiscoveryQueue';
import { SettingsPage }     from './pages/SettingsPage';
import { ProtectedRoute }   from './components/ProtectedRoute';
import { ClientPortalPipelineProvider } from './context/ClientPortalPipelineContext';

function P({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

function PNoGuest({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute blockedForRoles={['guest']}>{children}</ProtectedRoute>;
}

function Consultant({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute requiredRole="consultant">{children}</ProtectedRoute>;
}

function Client({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute requiredRole="client">{children}</ProtectedRoute>;
}

/** Client routes that share pipeline nav gating (brief gates + snapshot rules). */
function ClientPortalShell({ children }: { children: React.ReactNode }) {
  return (
    <Client>
      <ClientPortalPipelineProvider>{children}</ClientPortalPipelineProvider>
    </Client>
  );
}

export const router = createBrowserRouter([
  { path: '/',                    element: <RootEntry /> },
  { path: '/login',               element: <Login /> },
  { path: '/snapshot',            element: <SnapshotPage /> },
  { path: '/express-audit',       element: <ExpressAuditPage /> },
  { path: '/audit',               element: <FullAuditPage /> },
  { path: '/brief',               element: <PublicBriefPage /> },
  { path: '/faq',                 element: <FaqPage /> },
  { path: '/intake/:token',       element: <IntakeBrief /> },              // public pre-brief
  { path: '/audit/discover',      element: <DiscoveryPublicPage /> },
  { path: '/discovery',           element: <DiscoveryPublicPage /> },

  // ── Consultant routes ──────────────────────────────────────────────────────
  { path: '/dashboard',           element: <Consultant><Dashboard /></Consultant> },
  { path: '/portfolio',           element: <Navigate to="/dashboard" replace /> },  // backward compat
  { path: '/admin/requests',      element: <Consultant><AdminRequestQueue /></Consultant> },
  { path: '/admin/discovery',     element: <Consultant><DiscoveryQueue /></Consultant> },
  { path: '/audit/new',           element: <Consultant><NewAudit /></Consultant> },
  { path: '/audit/:id',           element: <Consultant><AuditWorkspace /></Consultant> },
  { path: '/audit/:id/:domainId', element: <Consultant><AuditWorkspace /></Consultant> },
  { path: '/pipeline/:id',        element: <Consultant><PipelineMonitor /></Consultant> },
  { path: '/reports/:id',         element: <Consultant><ReportViewer /></Consultant> },
  { path: '/portal/reports/:id',  element: <ClientPortalShell><ReportViewer /></ClientPortalShell> },
  { path: '/strategy/:id',        element: <Consultant><StrategyLab /></Consultant> },
  { path: '/settings',            element: <PNoGuest><SettingsPage /></PNoGuest> },

  // ── Client portal routes ───────────────────────────────────────────────────
  { path: '/portal',                  element: <ClientPortalShell><ClientPortal /></ClientPortalShell> },
  { path: '/portal/audit/new',        element: <ClientPortalShell><NewAudit variant="client_self_serve" /></ClientPortalShell> },
  { path: '/portal/pipeline/:id',     element: <ClientPortalShell><PipelineMonitor /></ClientPortalShell> },
  { path: '/portal/audit/:id',        element: <ClientPortalShell><ClientAuditView /></ClientPortalShell> },
]);
