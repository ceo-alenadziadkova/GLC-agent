import { useMemo } from 'react';
import { AppShell } from '../components/AppShell';
import { DESIGN_SYSTEM_INTERNAL_PAGE_COPY } from '../config/design-system-internal-page-copy.en';
import { DESIGN_SYSTEM_INTERNAL_MANIFEST } from '../data/design-system-internal-manifest';
import { AdminDesignSystemShowcasePanels } from './internal/AdminDesignSystemShowcasePanels';

const COPY = DESIGN_SYSTEM_INTERNAL_PAGE_COPY;
const MANIFEST = DESIGN_SYSTEM_INTERNAL_MANIFEST;

export function AdminDesignSystemPage() {
  const json = useMemo(() => JSON.stringify(MANIFEST, null, 2), []);

  return (
    <AppShell title={COPY.title} subtitle={COPY.subtitle}>
      <AdminDesignSystemShowcasePanels json={json} />
    </AppShell>
  );
}
