import { Warning } from '@phosphor-icons/react';
import { WORKSPACE_PAGE_COPY } from '../../../config/workspace-page-copy';

const copy = WORKSPACE_PAGE_COPY.intakePublicPrebrief;

export function IntakeBriefExpired() {
  return (
    <div className="text-center space-y-3">
      <Warning className="w-10 h-10 mx-auto ds-text-score-2"  />
      <p style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{copy.expiredTitle}</p>
      <p className="text-sm ds-text-secondary" >
        {copy.expiredBody}
      </p>
    </div>
  );
}
