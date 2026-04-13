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
import { IntakeWordingWorkspace } from './pages/IntakeWordingWorkspace';
import { QuestionBankStudioPage } from './pages/QuestionBankStudioPage';
import { ProtectedRoute }   from './components/ProtectedRoute';
import { ClientPortalPipelineProvider } from './context/ClientPortalPipelineContext';
import { RouteErrorPage }   from './components/RouteErrorPage';
import { APP_ROUTE_SEGMENTS as P, SPA_ROUTE_SEGMENTS as R } from '@glc/intake-core';

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
      { path: P.login, element: <Login /> },
      { path: R.snapshot, element: <SnapshotPage /> },
      { path: R.expressAudit, element: <ExpressAuditPage /> },
      { path: P.brief, element: <PublicBriefPage /> },
      { path: P.faq, element: <FaqPage /> },
      { path: P.intakeToken, element: <IntakeBrief /> },
      { path: P.discoveryPublicLegacy, element: <DiscoveryPublicPage /> },
      { path: R.discovery, element: <DiscoveryPublicPage /> },

      // Static / audit paths before :id (avoid "new" and "discover" captured as ids)
      { path: P.auditNew, element: <Consultant><NewAudit /></Consultant> },
      { path: P.auditByDomain, element: <Consultant><AuditWorkspace /></Consultant> },
      { path: P.auditById, element: <Consultant><AuditWorkspace /></Consultant> },
      { path: R.fullAudit, element: <FullAuditPage /> },

      // ── Consultant routes ──────────────────────────────────────────────────
      { path: P.dashboard, element: <Consultant><Dashboard /></Consultant> },
      { path: P.portfolio, element: <Navigate to={`/${P.dashboard}`} replace /> },
      { path: P.adminRequests, element: <Consultant><AdminRequestQueue /></Consultant> },
      { path: P.adminSnapshots, element: <Consultant><AdminSnapshotQueue /></Consultant> },
      { path: P.adminDiscovery, element: <Consultant><DiscoveryQueue /></Consultant> },
      { path: P.adminIntakeWording, element: <Consultant><IntakeWordingWorkspace /></Consultant> },
      { path: P.adminQuestionBankStudio, element: <Consultant><QuestionBankStudioPage /></Consultant> },
      { path: P.pipelineById, element: <Consultant><PipelineMonitor /></Consultant> },
      { path: P.reportsById, element: <Consultant><ReportViewer /></Consultant> },
      { path: P.strategyById, element: <Consultant><StrategyLab /></Consultant> },
      { path: P.settings, element: <PNoGuest><SettingsPage /></PNoGuest> },

      // ── Client portal (literal routes before :id) ───────────────────────────
      { path: P.portalAuditNew, element: <ClientPortalShell><NewAudit variant="client_self_serve" /></ClientPortalShell> },
      { path: P.portalPipelineById, element: <ClientPortalShell><PipelineMonitor /></ClientPortalShell> },
      { path: P.portalReportsById, element: <ClientPortalShell><ReportViewer /></ClientPortalShell> },
      { path: P.portalAuditById, element: <ClientPortalShell><ClientAuditView /></ClientPortalShell> },
      { path: P.portal, element: <ClientPortalShell><ClientPortal /></ClientPortalShell> },
    ],
  },
]);
