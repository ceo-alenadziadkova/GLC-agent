import { Link } from 'react-router';
import { AppShell } from '../../components/AppShell';
import { Button } from '../../components/ui/button';
import { APP_ROUTE_PATHS } from '../../config/route-paths';
import { ADMIN_REQUEST_QUEUE_COPY } from '../../config/admin-request-queue-copy.en';
import { AuditRequestQueueCard } from './components/AuditRequestQueueCard';
import { AuditRequestsPagination } from './components/AuditRequestsPagination';
import { AdminRequestQueueEmptyState } from './components/AdminRequestQueueEmptyState';
import { AdminRequestQueueErrorBanner } from './components/AdminRequestQueueErrorBanner';
import { AdminRequestQueueFilters } from './components/AdminRequestQueueFilters';
import { AdminRequestQueueLoading } from './components/AdminRequestQueueLoading';
import { IntakeSubmissionQueueCard } from './components/IntakeSubmissionQueueCard';
import {
  ADMIN_REQUEST_QUEUE_FILTER_ORDER,
  useAdminRequestQueue,
} from './hooks/useAdminRequestQueue';
import { useTablistKeyboardNavigation } from '../../hooks/useTablistKeyboardNavigation';
import {
  ADMIN_REQUEST_QUEUE_TAB_PANEL_ID,
  isAwaitingAdminQueueFilter,
} from '../queue-tab-config';

export function AdminRequestQueue() {
  const {
    filter,
    setFilter,
    setAuditReqOffset,
    intakeLoadError,
    loading,
    error,
    awaitingRows,
    visible,
    pagination,
    busyId,
    rejectNote,
    setRejectNote,
    expandedIntakeToken,
    setExpandedIntakeToken,
    copiedIntakeUrl,
    setCopiedIntakeUrl,
    approve,
    reject,
    retryLoad,
    auditReqLimit,
    auditReqTotal,
    auditReqPageOffset,
  } = useAdminRequestQueue();

  const listEmpty = isAwaitingAdminQueueFilter(filter) ? awaitingRows.length === 0 : visible.length === 0;
  const { setTabRef, handleTablistKeyDown } = useTablistKeyboardNavigation({
    order: ADMIN_REQUEST_QUEUE_FILTER_ORDER,
    activeKey: filter,
    onChange: (next) => setFilter(next as typeof filter),
  });

  return (
    <AppShell
      title={ADMIN_REQUEST_QUEUE_COPY.pageTitle}
      subtitle={ADMIN_REQUEST_QUEUE_COPY.pageSubtitle}
      actions={
        <div className="flex flex-col gap-2 w-full sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:w-auto">
          <Button asChild variant="outline" size="sm" className="glc-touch-target justify-center no-underline sm:min-h-0 sm:min-w-0">
            <Link to={APP_ROUTE_PATHS.adminAudits}>{ADMIN_REQUEST_QUEUE_COPY.navPortfolio}</Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="glc-touch-target justify-center no-underline sm:min-h-0 sm:min-w-0">
            <Link to={APP_ROUTE_PATHS.adminSnapshots}>{ADMIN_REQUEST_QUEUE_COPY.navSnapshots}</Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="glc-touch-target justify-center no-underline sm:min-h-0 sm:min-w-0">
            <Link to={APP_ROUTE_PATHS.adminDiscovery}>{ADMIN_REQUEST_QUEUE_COPY.navDiscovery}</Link>
          </Button>
        </div>
      }
    >
      <div className="glc-page-content mx-auto max-w-4xl space-y-4 lg:max-w-5xl">
        <AdminRequestQueueFilters
          filter={filter}
          onFilterChange={setFilter}
          tabListAriaLabel={ADMIN_REQUEST_QUEUE_COPY.pageTitle}
          tabPanelId={ADMIN_REQUEST_QUEUE_TAB_PANEL_ID}
          onTabListKeyDown={handleTablistKeyDown}
          setTabRef={setTabRef}
        />

        <section
          id={ADMIN_REQUEST_QUEUE_TAB_PANEL_ID}
          role="tabpanel"
          aria-labelledby={`admin-request-queue-tab-${filter}`}
          className="space-y-4"
        >
          {loading && <AdminRequestQueueLoading />}

          {!loading && error && <AdminRequestQueueErrorBanner message={error} onRetry={retryLoad} />}

          {!loading && !error && listEmpty && <AdminRequestQueueEmptyState filter={filter} />}

          {!loading && !error && filter === 'pending' && awaitingRows.length > 0 && (
            <section className="space-y-3">
              {intakeLoadError && (
                <p className="text-xs text-[var(--score-2)]">
                  {ADMIN_REQUEST_QUEUE_COPY.preBriefListUnavailablePrefix} {intakeLoadError}
                </p>
              )}
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between flex-wrap">
                <h2 className="m-0 text-sm font-semibold text-[var(--text-primary)]">
                  {ADMIN_REQUEST_QUEUE_COPY.awaitingSectionTitle}
                </h2>
                <p className="m-0 text-xs text-[var(--text-tertiary)]">
                  {ADMIN_REQUEST_QUEUE_COPY.awaitingSummaryLine(
                    awaitingRows.length,
                    awaitingRows.filter(r => r.kind === 'request').length,
                    awaitingRows.filter(r => r.kind === 'intake').length,
                  )}
                </p>
              </div>
              <div className="space-y-3">
                {awaitingRows.map(row => {
                  if (row.kind === 'request') {
                    return (
                      <AuditRequestQueueCard
                        key={row.req.id}
                        req={row.req}
                        showKindLabel
                        busyId={busyId}
                        rejectNote={rejectNote}
                        setRejectNote={setRejectNote}
                        onApprove={approve}
                        onReject={reject}
                      />
                    );
                  }
                  const s = row.s;
                  const open = expandedIntakeToken === s.token;
                  return (
                    <IntakeSubmissionQueueCard
                      key={`intake-${s.token}`}
                      submission={s}
                      expanded={open}
                      onToggleExpand={() => setExpandedIntakeToken(open ? null : s.token)}
                      copiedIntakeUrl={copiedIntakeUrl}
                      onCopiedIntakeUrl={setCopiedIntakeUrl}
                    />
                  );
                })}
              </div>
            </section>
          )}

          {!loading && !error && filter === 'all' && visible.length > 0 && (
            <div className="space-y-3">
              {visible.map(req => (
                <AuditRequestQueueCard
                  key={req.id}
                  req={req}
                  showKindLabel={false}
                  busyId={busyId}
                  rejectNote={rejectNote}
                  setRejectNote={setRejectNote}
                  onApprove={approve}
                  onReject={reject}
                />
              ))}
            </div>
          )}

          {!loading && !error && filter === 'all' && pagination.showPagination && (
            <AuditRequestsPagination
              rangeFrom={pagination.rangeFrom}
              rangeTo={pagination.rangeTo}
              total={auditReqTotal}
              pageOffset={auditReqPageOffset}
              limit={auditReqLimit}
              onPrev={() => setAuditReqOffset(o => Math.max(0, o - auditReqLimit))}
              onNext={() => setAuditReqOffset(o => o + auditReqLimit)}
            />
          )}
        </section>
      </div>
    </AppShell>
  );
}
