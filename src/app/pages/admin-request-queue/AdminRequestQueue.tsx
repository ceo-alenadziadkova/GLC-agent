import { Link } from 'react-router';
import { AppShell } from '../../components/AppShell';
import { APP_ROUTE_PATHS } from '../../config/route-paths';
import { ADMIN_REQUEST_QUEUE_COPY } from '../../config/admin-request-queue-copy.en';
import { AuditRequestQueueCard } from './components/AuditRequestQueueCard';
import { AuditRequestsPagination } from './components/AuditRequestsPagination';
import { AdminRequestQueueEmptyState } from './components/AdminRequestQueueEmptyState';
import { AdminRequestQueueErrorBanner } from './components/AdminRequestQueueErrorBanner';
import { AdminRequestQueueFilters } from './components/AdminRequestQueueFilters';
import { AdminRequestQueueLoading } from './components/AdminRequestQueueLoading';
import { IntakeSubmissionQueueCard } from './components/IntakeSubmissionQueueCard';
import { useAdminRequestQueue } from './hooks/useAdminRequestQueue';

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
    auditReqLimit,
    auditReqTotal,
    auditReqPageOffset,
  } = useAdminRequestQueue();

  const listEmpty = filter === 'pending' ? awaitingRows.length === 0 : visible.length === 0;

  return (
    <AppShell
      title={ADMIN_REQUEST_QUEUE_COPY.pageTitle}
      subtitle={ADMIN_REQUEST_QUEUE_COPY.pageSubtitle}
      actions={
        <div className="flex flex-col gap-2 w-full sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:w-auto">
          <Link to={APP_ROUTE_PATHS.adminSnapshots} className="glc-btn-secondary no-underline text-sm glc-touch-target sm:min-h-0 sm:min-w-0 justify-center">
            {ADMIN_REQUEST_QUEUE_COPY.navSnapshots}
          </Link>
          <Link to={APP_ROUTE_PATHS.adminDiscovery} className="glc-btn-secondary no-underline text-sm glc-touch-target sm:min-h-0 sm:min-w-0 justify-center">
            {ADMIN_REQUEST_QUEUE_COPY.navDiscovery}
          </Link>
          <Link to={APP_ROUTE_PATHS.portfolio} className="glc-btn-secondary no-underline text-sm glc-touch-target sm:min-h-0 sm:min-w-0 justify-center">
            {ADMIN_REQUEST_QUEUE_COPY.navPortfolio}
          </Link>
        </div>
      }
    >
      <div className="glc-page-content max-w-4xl mx-auto space-y-4">
        <AdminRequestQueueFilters filter={filter} onFilterChange={setFilter} />

        {loading && <AdminRequestQueueLoading />}

        {!loading && error && <AdminRequestQueueErrorBanner message={error} />}

        {!loading && !error && listEmpty && <AdminRequestQueueEmptyState filter={filter} />}

        {!loading && !error && filter === 'pending' && awaitingRows.length > 0 && (
          <section className="space-y-3">
            {intakeLoadError && (
              <p className="text-xs" style={{ color: 'var(--score-2)' }}>
                {ADMIN_REQUEST_QUEUE_COPY.preBriefListUnavailablePrefix} {intakeLoadError}
              </p>
            )}
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between flex-wrap">
              <h2 className="text-sm font-semibold m-0" style={{ color: 'var(--text-primary)' }}>
                {ADMIN_REQUEST_QUEUE_COPY.awaitingSectionTitle}
              </h2>
              <p className="text-xs m-0" style={{ color: 'var(--text-tertiary)' }}>
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
      </div>
    </AppShell>
  );
}
