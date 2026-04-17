import { Link, useParams, useLocation } from 'react-router';
import {
  MagnifyingGlass, HardDrives, Shield, Globe, Cursor,
  Target, Lightning, MapTrifold, SquaresFour, type Icon
} from '@phosphor-icons/react';
import { ScoreIndicator } from './ScoreIndicator';
import { cn } from './ui/utils';
import { APP_RELEASE_META, getAppReleaseMetaLine } from '../config/app-release-meta';
import { AUDIT_NAVIGATION_DOMAINS } from '../config/audit-navigation-domains';

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
    <nav className="flex h-full flex-col border-r border-[var(--panel-border)] bg-[var(--bg-surface)]">
      {/* Header */}
      <div className="border-b border-[var(--panel-border)] p-6">
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">
          GLC Audit Platform
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
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
          >
            <SquaresFour
              className={cn(
                'h-5 w-5 flex-shrink-0',
                isOverviewActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]',
              )}
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

        <div className="mb-3 px-3 text-xs font-semibold tracking-wide text-[var(--text-tertiary)]">
          AUDIT DOMAINS
        </div>

        <div className="space-y-1">
          {AUDIT_NAVIGATION_DOMAINS.map((domain) => {
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
              >
                <Icon
                  className={cn(
                    'h-5 w-5 flex-shrink-0',
                    isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]',
                  )}
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
        <div className="mt-6 border-t border-[var(--panel-border)] pt-6">
          <Link
            to="/audit/strategy"
            className={cn(
              'flex items-center gap-3 px-3 py-3 rounded-lg transition-all',
              'hover:bg-[var(--surface)]',
              isStrategyActive && 'bg-[var(--surface)]'
            )}
          >
            <MapTrifold
              className={cn(
                'h-5 w-5 flex-shrink-0',
                isStrategyActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]',
              )}
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
      <div className="border-t border-[var(--panel-border)] p-4">
        <div className="text-xs text-[var(--text-tertiary)]">
          <div>{APP_RELEASE_META.generatedLabel}</div>
          <div className="mt-1">{getAppReleaseMetaLine()}</div>
        </div>
      </div>
    </nav>
  );
}