import { createBrowserRouter, Navigate } from 'react-router';
import { Portfolio }        from './pages/Portfolio';
import { NewAudit }         from './pages/NewAudit';
import { AuditWorkspace }   from './pages/AuditWorkspace';
import { PipelineMonitor }  from './pages/PipelineMonitor';
import { ReportViewer }     from './pages/ReportViewer';
import { StrategyLab }      from './pages/StrategyLab';
import { Login }            from './pages/Login';
import { SnapshotLanding }  from './pages/SnapshotLanding';
import { ClientPortal }     from './pages/ClientPortal';
import { ClientRequestForm } from './pages/ClientRequestForm';
import { ClientAuditView }  from './pages/ClientAuditView';
import { ProtectedRoute }   from './components/ProtectedRoute';

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
  { path: '/',                    element: <Navigate to="/portfolio" replace /> },
  { path: '/login',               element: <Login /> },
  { path: '/snapshot',            element: <SnapshotLanding /> },           // public

  // ── Consultant routes ──────────────────────────────────────────────────────
  { path: '/portfolio',           element: <Consultant><Portfolio /></Consultant> },
  { path: '/audit/new',           element: <Consultant><NewAudit /></Consultant> },
  { path: '/audit/:id',           element: <Consultant><AuditWorkspace /></Consultant> },
  { path: '/audit/:id/:domainId', element: <Consultant><AuditWorkspace /></Consultant> },
  { path: '/pipeline/:id',        element: <Consultant><PipelineMonitor /></Consultant> },
  { path: '/reports/:id',         element: <Consultant><ReportViewer /></Consultant> },
  { path: '/strategy/:id',        element: <Consultant><StrategyLab /></Consultant> },

  // ── Client portal routes ───────────────────────────────────────────────────
  { path: '/portal',                  element: <Client><ClientPortal /></Client> },
  { path: '/portal/request',          element: <Client><ClientRequestForm /></Client> },
  { path: '/portal/request/:id',      element: <Client><ClientAuditView /></Client> },
  { path: '/portal/audit/:id',        element: <Client><ClientAuditView /></Client> },
]);
