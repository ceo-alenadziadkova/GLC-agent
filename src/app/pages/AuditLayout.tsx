import { Outlet, useParams, useLocation } from 'react-router';
import { AuditNavigation } from '../components/AuditNavigation';
import { DomainContext } from '../components/DomainContext';
import { auditDomains } from '../data/auditData';

export function AuditLayout() {
  const { domainId } = useParams();
  const location = useLocation();
  const currentDomain = auditDomains.find(d => d.id === domainId);
  const isStrategyPage = location.pathname === '/audit/strategy';
  const isOverviewPage = location.pathname === '/audit/overview';
  const showContext = currentDomain !== undefined && !isStrategyPage && !isOverviewPage;

  return (
    <div className="h-screen flex overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      {/* Left Panel - Audit Navigation */}
      <div className="w-80 flex-shrink-0">
        <AuditNavigation />
      </div>

      {/* Main Panel - Audit Report */}
      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>

      {/* Right Panel - Domain Context */}
      {showContext && currentDomain && (
        <div className="w-80 flex-shrink-0">
          <DomainContext domain={currentDomain} />
        </div>
      )}
    </div>
  );
}