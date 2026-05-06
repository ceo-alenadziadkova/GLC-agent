import type { ReactNode } from 'react';
import { useEffect } from 'react';
import {
  createBrowserRouter,
  Navigate,
  Outlet,
  ScrollRestoration,
  useLocation,
  useParams,
} from 'react-router';
import { Dashboard }        from './pages/Dashboard';
import { NewAudit }         from './pages/NewAudit';
import { AuditWorkspace }   from './pages/AuditWorkspace';
import { PipelineMonitor }  from './pages/PipelineMonitor';
import { ReportViewer }     from './pages/ReportViewer';
import { Login }            from './pages/Login';
import { IntakeBrief }       from './pages/intake-brief/IntakeBrief';
import { ClientPortal }     from './pages/ClientPortal';
import { ClientAuditView }  from './pages/ClientAuditView';
import { PortalRoadmapManifestWizardPage } from './pages/PortalRoadmapManifestWizardPage';
import { LegacyPlanPathRedirect } from './pages/portal-plan/LegacyPlanPathRedirect';
import { LegacyStrategyPathRedirect } from './pages/portal-plan/LegacyStrategyPathRedirect';
import { PortalPlanPage } from './pages/portal-plan/PortalPlanPage';
import { ConsultantOrchestrationCockpitPage } from './pages/ConsultantOrchestrationCockpitPage';
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
import { AdminAllAudits } from './pages/AdminAllAudits';
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
import { applyGlcColorScheme } from './lib/glc-theme';

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
  const { pathname } = useLocation();
  useEffect(() => {
    applyGlcColorScheme();
  }, [pathname]);

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

function LegacyBriefSchemaRedirect() {
  const { id } = useParams<{ id: string }>();
  if (!id) return <Navigate to="/dashboard" replace />;
  return <Navigate to={`/audit/${encodeURIComponent(id)}?brief=1`} replace />;
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
      /**
       * Legacy/support deep-link alias: brief/schema is an API endpoint, not an SPA page.
       * Redirect to the audit workspace brief tab to avoid RouteError 404.
       */
      { path: 'audit/:id/brief/schema', element: <LegacyBriefSchemaRedirect /> },
      { path: P.auditByDomain, element: <Consultant><AuditWorkspace /></Consultant> },
      { path: P.auditById, element: <Consultant><AuditWorkspace /></Consultant> },
      { path: 'audit', element: <Navigate to={`/${R.completePackage}`} replace /> },

      // ── Consultant routes ──────────────────────────────────────────────────
      { path: P.dashboard, element: <Consultant><Dashboard /></Consultant> },
      { path: P.portfolio, element: <Navigate to={`/${P.adminAudits}`} replace /> },
      { path: P.adminRequests, element: <Consultant><AdminRequestQueue /></Consultant> },
      { path: P.adminAudits, element: <Consultant><AdminAllAudits /></Consultant> },
      { path: P.adminSnapshots, element: <Consultant><AdminSnapshotQueue /></Consultant> },
      { path: P.adminDiscovery, element: <Consultant><DiscoveryQueue /></Consultant> },
      { path: P.adminIntakeWording, element: <Consultant><IntakeWordingWorkspace /></Consultant> },
      { path: P.adminQuestionBankStudio, element: <Consultant><QuestionBankStudioPage /></Consultant> },
      { path: P.adminDesignSystem, element: <Consultant><AdminDesignSystemPage /></Consultant> },
      { path: P.pipelineById, element: <Consultant><PipelineMonitor /></Consultant> },
      { path: P.timelineById, element: <Consultant><LegacyPlanPathRedirect variant="consultant" surface="timeline" /></Consultant> },
      { path: P.roadmapById, element: <Consultant><LegacyPlanPathRedirect variant="consultant" surface="roadmap" /></Consultant> },
      { path: P.planById, element: <Consultant><PortalPlanPage /></Consultant> },
      { path: P.reportsById, element: <Consultant><ReportViewer /></Consultant> },
      { path: P.strategyById, element: <Consultant><LegacyStrategyPathRedirect variant="consultant" /></Consultant> },
      { path: P.auditOrchestrationById, element: <Consultant><ConsultantOrchestrationCockpitPage /></Consultant> },
      { path: P.settings, element: <PNoGuest><SettingsPage /></PNoGuest> },

      // ── Client portal (literal routes before :id) ───────────────────────────
      { path: P.portalAuditNew, element: <ClientPortalShell><NewAudit variant="client_self_serve" /></ClientPortalShell> },
      { path: P.portalPipelineById, element: <ClientPortalShell><PipelineMonitor /></ClientPortalShell> },
      { path: P.portalReportsById, element: <ClientPortalShell><ReportViewer /></ClientPortalShell> },
      { path: P.portalTimelineById, element: <ClientPortalShell><LegacyPlanPathRedirect variant="portal" surface="timeline" /></ClientPortalShell> },
      { path: P.portalRoadmapById, element: <ClientPortalShell><LegacyPlanPathRedirect variant="portal" surface="roadmap" /></ClientPortalShell> },
      { path: P.portalPlanById, element: <ClientPortalShell><PortalPlanPage /></ClientPortalShell> },
      { path: P.portalStrategyById, element: <ClientPortalShell><LegacyStrategyPathRedirect variant="portal" /></ClientPortalShell> },
      { path: P.portalRoadmapManifestByAuditId, element: <ClientPortalShell><PortalRoadmapManifestWizardPage /></ClientPortalShell> },
      { path: P.portalAuditById, element: <ClientPortalShell><ClientAuditView /></ClientPortalShell> },
      { path: P.portal, element: <ClientPortalShell><ClientPortal /></ClientPortalShell> },
    ],
  },
]);
