import { createBrowserRouter, Navigate } from 'react-router';
import { Portfolio }        from './pages/Portfolio';
import { NewAudit }         from './pages/NewAudit';
import { AuditWorkspace }   from './pages/AuditWorkspace';
import { PipelineMonitor }  from './pages/PipelineMonitor';
import { ReportViewer }     from './pages/ReportViewer';
import { StrategyLab }      from './pages/StrategyLab';
import { Login }            from './pages/Login';
import { SnapshotLanding }  from './pages/SnapshotLanding';
import { ProtectedRoute }   from './components/ProtectedRoute';

function P({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

export const router = createBrowserRouter([
  { path: '/',                    element: <Navigate to="/portfolio" replace /> },
  { path: '/login',               element: <Login /> },
  { path: '/snapshot',            element: <SnapshotLanding /> },         // public
  { path: '/portfolio',           element: <P><Portfolio /></P> },
  { path: '/audit/new',           element: <P><NewAudit /></P> },
  { path: '/audit/:id',           element: <P><AuditWorkspace /></P> },
  { path: '/audit/:id/:domainId', element: <P><AuditWorkspace /></P> },
  { path: '/pipeline/:id',        element: <P><PipelineMonitor /></P> },
  { path: '/reports/:id',         element: <P><ReportViewer /></P> },
  { path: '/strategy/:id',        element: <P><StrategyLab /></P> },
]);
