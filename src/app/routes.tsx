import { createBrowserRouter, Navigate } from 'react-router';
import { Dashboard }        from './pages/Dashboard';
import { NewAudit }         from './pages/NewAudit';
import { AuditWorkspace }   from './pages/AuditWorkspace';
import { PipelineMonitor }  from './pages/PipelineMonitor';
import { ReportViewer }     from './pages/ReportViewer';
import { StrategyLab }      from './pages/StrategyLab';
import { Login }            from './pages/Login';
import { SnapshotLanding }  from './pages/SnapshotLanding';
import { IntakeBrief }       from './pages/IntakeBrief';
import { ClientPortal }     from './pages/ClientPortal';
import { ClientAuditView }  from './pages/ClientAuditView';
import { AdminRequestQueue } from './pages/AdminRequestQueue';
import { DiscoverPage }     from './pages/DiscoverPage';
import { DiscoveryQueue }   from './pages/DiscoveryQueue';
import { SettingsPage }     from './pages/SettingsPage';
import { ProtectedRoute }   from './components/ProtectedRoute';
import { RootRedirect }     from './components/RootRedirect';

function P({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

function Consultant({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute requiredRole="consultant">{children}</ProtectedRoute>;
}

function Client({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute requiredRole="client">{children}</ProtectedRoute>;
}

export const router = createBrowserRouter([
  { path: '/',                    element: <RootRedirect /> },
  { path: '/login',               element: <Login /> },
  { path: '/snapshot',            element: <SnapshotLanding /> },           // public
  { path: '/intake/:token',       element: <IntakeBrief /> },              // public pre-brief
  { path: '/audit/discover',      element: <DiscoverPage /> },             // public Mode C

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
  { path: '/portal/reports/:id',  element: <Client><ReportViewer /></Client> },
  { path: '/strategy/:id',        element: <Consultant><StrategyLab /></Consultant> },
  { path: '/settings',            element: <P><SettingsPage /></P> },

  // ── Client portal routes ───────────────────────────────────────────────────
  { path: '/portal',                  element: <Client><ClientPortal /></Client> },
  { path: '/portal/audit/new',        element: <Client><NewAudit variant="client_self_serve" /></Client> },
  { path: '/portal/pipeline/:id',     element: <Client><PipelineMonitor /></Client> },
  { path: '/portal/audit/:id',        element: <Client><ClientAuditView /></Client> },
]);
