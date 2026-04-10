import type { ReactNode } from 'react';
import { createBrowserRouter, Navigate, Outlet, ScrollRestoration } from 'react-router';
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
import { AdminSnapshotQueue } from './pages/AdminSnapshotQueue';
import { IntakeTraceTool } from './pages/IntakeTraceTool';
import { IntakeWordingWorkspace } from './pages/IntakeWordingWorkspace';
import { QuestionBankStudioPage } from './pages/QuestionBankStudioPage';
import { ProtectedRoute }   from './components/ProtectedRoute';
import { ClientPortalPipelineProvider } from './context/ClientPortalPipelineContext';
import { RouteErrorPage }   from './components/RouteErrorPage';

function PNoGuest({ children }: { children: ReactNode }) {
  return <ProtectedRoute blockedForRoles={['guest']}>{children}</ProtectedRoute>;
}

function Consultant({ children }: { children: ReactNode }) {
  return <ProtectedRoute requiredRole="consultant">{children}</ProtectedRoute>;
}

function Client({ children }: { children: ReactNode }) {
  return <ProtectedRoute requiredRole="client">{children}</ProtectedRoute>;
}

/** Client routes that share pipeline nav gating (brief gates + snapshot rules). */
function ClientPortalShell({ children }: { children: ReactNode }) {
  return (
    <Client>
      <ClientPortalPipelineProvider>{children}</ClientPortalPipelineProvider>
    </Client>
  );
}

function RootOutlet() {
  return (
    <>
      <ScrollRestoration />
      <Outlet />
    </>
  );
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootOutlet />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <RootEntry /> },
      { path: 'login', element: <Login /> },
      { path: 'snapshot', element: <SnapshotPage /> },
      { path: 'express-audit', element: <ExpressAuditPage /> },
      { path: 'brief', element: <PublicBriefPage /> },
      { path: 'faq', element: <FaqPage /> },
      { path: 'intake/:token', element: <IntakeBrief /> },
      { path: 'audit/discover', element: <DiscoveryPublicPage /> },
      { path: 'discovery', element: <DiscoveryPublicPage /> },

      // Static / audit paths before :id (avoid "new" and "discover" captured as ids)
      { path: 'audit/new', element: <Consultant><NewAudit /></Consultant> },
      { path: 'audit/:id/:domainId', element: <Consultant><AuditWorkspace /></Consultant> },
      { path: 'audit/:id', element: <Consultant><AuditWorkspace /></Consultant> },
      { path: 'audit', element: <FullAuditPage /> },

      // ── Consultant routes ──────────────────────────────────────────────────
      { path: 'dashboard', element: <Consultant><Dashboard /></Consultant> },
      { path: 'portfolio', element: <Navigate to="/dashboard" replace /> },
      { path: 'admin/requests', element: <Consultant><AdminRequestQueue /></Consultant> },
      { path: 'admin/snapshots', element: <Consultant><AdminSnapshotQueue /></Consultant> },
      { path: 'admin/discovery', element: <Consultant><DiscoveryQueue /></Consultant> },
      // TODO(next iteration): routes remain accessible by direct URL while links are hidden in admin nav.
      { path: 'admin/intake-trace', element: <Consultant><IntakeTraceTool /></Consultant> },
      { path: 'admin/intake-wording', element: <Consultant><IntakeWordingWorkspace /></Consultant> },
      { path: 'admin/question-bank-studio', element: <Consultant><QuestionBankStudioPage /></Consultant> },
      { path: 'pipeline/:id', element: <Consultant><PipelineMonitor /></Consultant> },
      { path: 'reports/:id', element: <Consultant><ReportViewer /></Consultant> },
      { path: 'strategy/:id', element: <Consultant><StrategyLab /></Consultant> },
      { path: 'settings', element: <PNoGuest><SettingsPage /></PNoGuest> },

      // ── Client portal (literal routes before :id) ───────────────────────────
      { path: 'portal/audit/new', element: <ClientPortalShell><NewAudit variant="client_self_serve" /></ClientPortalShell> },
      { path: 'portal/pipeline/:id', element: <ClientPortalShell><PipelineMonitor /></ClientPortalShell> },
      { path: 'portal/reports/:id', element: <ClientPortalShell><ReportViewer /></ClientPortalShell> },
      { path: 'portal/audit/:id', element: <ClientPortalShell><ClientAuditView /></ClientPortalShell> },
      { path: 'portal', element: <ClientPortalShell><ClientPortal /></ClientPortalShell> },
    ],
  },
]);
