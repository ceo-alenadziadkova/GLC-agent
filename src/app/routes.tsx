import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { createBrowserRouter, Navigate, Outlet, ScrollRestoration } from 'react-router';
import { Dashboard }        from './pages/Dashboard';
import { NewAudit }         from './pages/NewAudit';
import { AuditWorkspace }   from './pages/AuditWorkspace';
import { PipelineMonitor }  from './pages/PipelineMonitor';
import { ReportViewer }     from './pages/ReportViewer';
import { StrategyLab }      from './pages/StrategyLab';
import { Login }            from './pages/Login';
import { IntakeBrief }       from './pages/intake-brief/IntakeBrief';
import { ClientPortal }     from './pages/ClientPortal';
import { ClientAuditView }  from './pages/ClientAuditView';
import { AdminRequestQueue } from './pages/admin-request-queue/AdminRequestQueue';
import { RootEntry }        from './components/RootEntry';
import { SnapshotPage }     from './pages/SnapshotPage';
import { ExpressAuditPage } from './pages/ExpressAuditPage';
import { FullAuditPage }    from './pages/FullAuditPage';
import { ProAuditPage }     from './pages/ProAuditPage';
import { PublicBriefPage }  from './pages/PublicBriefPage';
import { FaqPage }          from './pages/FaqPage';
import { DataProcessingAgreementPage } from './pages/DataProcessingAgreementPage';
import { LegalNoticePage } from './pages/LegalNoticePage';
import { CookiesPolicyPage } from './pages/CookiesPolicyPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { TermsOfServicePage } from './pages/TermsOfServicePage';
import { DiscoveryPublicPage } from './pages/DiscoveryPublicPage';
import { DiscoveryQueue }   from './pages/DiscoveryQueue';
import { SettingsPage }     from './pages/SettingsPage';
import { AdminSnapshotQueue } from './pages/AdminSnapshotQueue';
import { IntakeWordingWorkspace } from './pages/IntakeWordingWorkspace';
import { QuestionBankStudioPage } from './pages/QuestionBankStudioPage';
import { AdminDesignSystemPage } from './pages/AdminDesignSystemPage';
import { ProtectedRoute }   from './components/ProtectedRoute';
import { ClientPortalPipelineProvider } from './context/ClientPortalPipelineContext';
import { RouteErrorPage }   from './components/RouteErrorPage';
import { CookieConsentProvider } from './components/cookie-consent/CookieConsentProvider';
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
  useEffect(() => {
    document.body.classList.add('glc-site-polish');
    return () => {
      document.body.classList.remove('glc-site-polish');
    };
  }, []);

  return (
    <CookieConsentProvider>
      <ScrollRestoration />
      <Outlet />
    </CookieConsentProvider>
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
      { path: R.starterPackage, element: <ExpressAuditPage /> },
      { path: R.proPackage, element: <ProAuditPage /> },
      { path: R.completePackage, element: <FullAuditPage /> },
      { path: 'express-audit', element: <Navigate to={`/${R.starterPackage}`} replace /> },
      { path: P.brief, element: <PublicBriefPage /> },
      { path: P.faq, element: <FaqPage /> },
      { path: 'legal/terms', element: <TermsOfServicePage /> },
      { path: 'legal/privacy', element: <PrivacyPolicyPage /> },
      { path: 'legal/cookies', element: <CookiesPolicyPage /> },
      { path: 'legal/dpa', element: <DataProcessingAgreementPage /> },
      { path: 'legal/aviso-legal', element: <LegalNoticePage /> },
      { path: P.intakeToken, element: <IntakeBrief /> },
      { path: P.discoveryPublicLegacy, element: <DiscoveryPublicPage /> },
      { path: R.discovery, element: <DiscoveryPublicPage /> },

      // Static / audit paths before :id (avoid "new" and "discover" captured as ids)
      { path: P.auditNew, element: <Consultant><NewAudit /></Consultant> },
      { path: P.auditByDomain, element: <Consultant><AuditWorkspace /></Consultant> },
      { path: P.auditById, element: <Consultant><AuditWorkspace /></Consultant> },
      { path: 'audit', element: <Navigate to={`/${R.completePackage}`} replace /> },

      // ── Consultant routes ──────────────────────────────────────────────────
      { path: P.dashboard, element: <Consultant><Dashboard /></Consultant> },
      { path: P.portfolio, element: <Navigate to={`/${P.dashboard}`} replace /> },
      { path: P.adminRequests, element: <Consultant><AdminRequestQueue /></Consultant> },
      { path: P.adminSnapshots, element: <Consultant><AdminSnapshotQueue /></Consultant> },
      { path: P.adminDiscovery, element: <Consultant><DiscoveryQueue /></Consultant> },
      { path: P.adminIntakeWording, element: <Consultant><IntakeWordingWorkspace /></Consultant> },
      { path: P.adminQuestionBankStudio, element: <Consultant><QuestionBankStudioPage /></Consultant> },
      { path: P.adminDesignSystem, element: <Consultant><AdminDesignSystemPage /></Consultant> },
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
