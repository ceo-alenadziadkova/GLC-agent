import { useParams } from 'react-router';
import { AppShell } from '../components/AppShell';
import { UI_SEMANTIC_COLORS } from '../../design-system/tokens/ui-semantic-colors';
import { CLIENT_AUDIT_VIEW_COPY } from '../config/client-audit-view-copy';
import { ClientAuditScreen } from './client-audit-view/ClientAuditScreen';

// ── Page ─────────────────────────────────────────────────────────────────────
/** Audit + brief gates load via TanStack Query (`useAudit` + shared `brief` query key). */

export function ClientAuditView() {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return (
      <AppShell title={CLIENT_AUDIT_VIEW_COPY.page.title} subtitle="">
        <div className="glc-page-content max-w-2xl mx-auto text-sm" style={{ color: UI_SEMANTIC_COLORS.danger }}>{CLIENT_AUDIT_VIEW_COPY.page.missingId}</div>
      </AppShell>
    );
  }

  return <ClientAuditScreen auditId={id} />;
}
