import { WORKSPACE_PAGE_COPY } from '../../../config/workspace-page-copy';
import { Button } from '../../../components/ui/button';

const copy = WORKSPACE_PAGE_COPY.intakePublicPrebrief;

export function IntakeBriefLoadError({ message }: { message: string }) {
  return (
    <div className="text-center space-y-4 w-full">
      <p className="text-[var(--score-1)]">{message}</p>
      <Button type="button" variant="outline" size="sm" className="text-sm" onClick={() => window.location.reload()}>
        {copy.retry}
      </Button>
    </div>
  );
}
