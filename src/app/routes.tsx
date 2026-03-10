import { createBrowserRouter, Navigate } from 'react-router';
import { Portfolio }       from './pages/Portfolio';
import { AuditWorkspace }  from './pages/AuditWorkspace';
import { PipelineMonitor } from './pages/PipelineMonitor';
import { ReportViewer }    from './pages/ReportViewer';
import { StrategyLab }     from './pages/StrategyLab';

export const router = createBrowserRouter([
  { path: '/',            element: <Navigate to="/portfolio" replace /> },
  { path: '/portfolio',   element: <Portfolio /> },
  { path: '/audit',       element: <AuditWorkspace /> },
  { path: '/audit/:domainId', element: <AuditWorkspace /> },
  { path: '/pipeline',    element: <PipelineMonitor /> },
  { path: '/reports',     element: <ReportViewer /> },
  { path: '/strategy',    element: <StrategyLab /> },
]);
