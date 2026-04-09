import { MarketingLayout } from '../marketing/MarketingLayout';
import { SnapshotLanding } from './SnapshotLanding';

/** Site nav header + snapshot tool (embedded mode hides duplicate SnapshotLanding header). */
export function SnapshotPage() {
  return (
    <MarketingLayout
      showFooter={false}
      breadcrumbs={[
        { label: 'Home', to: '/' },
        { label: 'Snapshot' },
      ]}
    >
      <SnapshotLanding embedded />
    </MarketingLayout>
  );
}
