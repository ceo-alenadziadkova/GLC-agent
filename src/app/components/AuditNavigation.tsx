import { Link, useParams, useLocation } from 'react-router';
import {
  MagnifyingGlass, HardDrives, Shield, Globe, Cursor,
  Target, Lightning, MapTrifold, SquaresFour, type Icon
} from '@phosphor-icons/react';
import { ScoreIndicator } from './ScoreIndicator';
import { auditDomains } from '../data/auditData';
import { cn } from './ui/utils';

const iconMap: Record<string, Icon> = {
  Search: MagnifyingGlass,
  Server: HardDrives,
  Shield,
  Globe,
  MousePointer: Cursor,
  Target,
  Zap: Lightning,
  Map: MapTrifold
};

export function AuditNavigation() {
  const { domainId } = useParams();
  const location = useLocation();
  const isStrategyActive = location.pathname === '/audit/strategy';
  const isOverviewActive = location.pathname === '/audit/overview';

  return (
    <nav className="h-full bg-white border-r flex flex-col" style={{ borderColor: 'var(--panel-border)' }}>
      {/* Header */}
      <div className="p-6 border-b" style={{ borderColor: 'var(--panel-border)' }}>
        <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          GLC Audit Platform
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Business & Tech Audit
        </p>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Overview Link */}
        <div className="mb-6">
          <Link
            to="/audit/overview"
            className={cn(
              'flex items-center gap-3 px-3 py-3 rounded-lg transition-all',
              'hover:bg-[var(--surface)]',
              isOverviewActive && 'bg-[var(--surface)]'
            )}
            style={{
              transition: 'var(--transition-fast)'
            }}
          >
            <SquaresFour
              className="w-5 h-5 flex-shrink-0"
              style={{ color: isOverviewActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}
            />
            <div className="flex-1 min-w-0">
              <div className={cn(
                'text-sm font-medium truncate',
                isOverviewActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
              )}>
                Overview
              </div>
            </div>
          </Link>
        </div>

        <div className="text-xs font-semibold tracking-wide mb-3 px-3" style={{ color: 'var(--text-tertiary)' }}>
          AUDIT DOMAINS
        </div>

        <div className="space-y-1">
          {auditDomains.map((domain) => {
            const Icon = iconMap[domain.icon];
            const isActive = domainId === domain.id;

            return (
              <Link
                key={domain.id}
                to={`/audit/${domain.id}`}
                className={cn(
                  'flex items-center gap-3 px-3 py-3 rounded-lg transition-all',
                  'hover:bg-[var(--surface)]',
                  isActive && 'bg-[var(--surface)]'
                )}
                style={{
                  transition: 'var(--transition-fast)'
                }}
              >
                <Icon 
                  className="w-5 h-5 flex-shrink-0" 
                  style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}
                />
                <div className="flex-1 min-w-0">
                  <div className={cn(
                    'text-sm font-medium truncate',
                    isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
                  )}>
                    {domain.name}
                  </div>
                </div>
                <ScoreIndicator score={domain.score} size="sm" />
              </Link>
            );
          })}
        </div>

        {/* Roadmap Link */}
        <div className="mt-6 pt-6 border-t" style={{ borderColor: 'var(--panel-border)' }}>
          <Link
            to="/audit/strategy"
            className={cn(
              'flex items-center gap-3 px-3 py-3 rounded-lg transition-all',
              'hover:bg-[var(--surface)]',
              isStrategyActive && 'bg-[var(--surface)]'
            )}
            style={{
              transition: 'var(--transition-fast)'
            }}
          >
            <MapTrifold
              className="w-5 h-5 flex-shrink-0"
              style={{ color: isStrategyActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}
            />
            <div className="flex-1 min-w-0">
              <div className={cn(
                'text-sm font-medium truncate',
                isStrategyActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
              )}>
                Strategy & Roadmap
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t" style={{ borderColor: 'var(--panel-border)' }}>
        <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          <div>Generated: March 9, 2026</div>
          <div className="mt-1">v2.1.4 • Enterprise</div>
        </div>
      </div>
    </nav>
  );
}