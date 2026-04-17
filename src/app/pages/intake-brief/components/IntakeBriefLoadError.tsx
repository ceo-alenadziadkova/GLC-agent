import { WORKSPACE_PAGE_COPY } from '../../../config/workspace-page-copy';

const copy = WORKSPACE_PAGE_COPY.intakePublicPrebrief;

export function IntakeBriefLoadError({ message }: { message: string }) {
  return (
    <div className="text-center space-y-4 w-full">
      <p style={{ color: 'var(--score-1)' }}>{message}</p>
      <button type="button" className="glc-btn-secondary text-sm" onClick={() => window.location.reload()}>
        {copy.retry}
      </button>
    </div>
  );
}
