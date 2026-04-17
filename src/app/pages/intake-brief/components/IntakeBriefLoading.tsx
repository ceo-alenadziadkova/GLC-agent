import { WORKSPACE_PAGE_COPY } from '../../../config/workspace-page-copy';

const copy = WORKSPACE_PAGE_COPY.intakePublicPrebrief;

export function IntakeBriefLoading() {
  return (
    <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
      {copy.loading}
    </p>
  );
}
