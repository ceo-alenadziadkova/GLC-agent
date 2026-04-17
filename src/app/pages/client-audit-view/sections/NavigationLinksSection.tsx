import { CaretRight, CheckCircle, FileText, Pulse } from '@phosphor-icons/react';
import { Link } from 'react-router';
import { Callout } from '../../../components/ui/callout';
import { CLIENT_AUDIT_VIEW_COPY } from '../../../config/client-audit-view-copy';
import { COLOR_TOKENS } from '../../../../design-system/tokens/colors';
import { CLIENT_AUDIT_VIEW_UI } from '../config/ui';

export function NavigationLinksSection({
  auditId,
  canViewPipeline,
  isCreated,
  isFreeSnapshot,
  isCompleted,
}: {
  auditId: string;
  canViewPipeline: boolean;
  isCreated: boolean;
  isFreeSnapshot: boolean;
  isCompleted: boolean;
}) {
  return (
    <>
      {isCompleted && !isFreeSnapshot && (
        <Link
          to={`/portal/reports/${auditId}`}
          className="flex items-center justify-between gap-3 px-5 py-4 mobile:px-4 rounded-xl no-underline transition-all"
          style={CLIENT_AUDIT_VIEW_UI.links.reportCard}
        >
          <div className="flex items-center gap-3 min-w-0">
            <FileText className="w-5 h-5 flex-shrink-0 ds-text-brand"  />
            <div>
              <div className="font-medium text-sm ds-text-primary" >{CLIENT_AUDIT_VIEW_COPY.links.viewReport}</div>
              <div className="ds-type-xs-secondary">{CLIENT_AUDIT_VIEW_COPY.links.reportFinished}</div>
            </div>
          </div>
          <CheckCircle weight="fill" className="w-5 h-5" color={COLOR_TOKENS.semantic.uiSemantic.success} />
        </Link>
      )}

      {canViewPipeline && (
        <Link
          to={`/portal/pipeline/${auditId}`}
          className="flex items-center justify-between gap-3 px-5 py-4 mobile:px-4 rounded-xl no-underline"
          style={CLIENT_AUDIT_VIEW_UI.links.pipelineCard}
        >
          <div className="flex items-center gap-3 min-w-0">
            <Pulse className="w-5 h-5 flex-shrink-0 ds-text-brand"  />
            <div>
              <div className="font-medium text-sm ds-text-primary" >{CLIENT_AUDIT_VIEW_COPY.links.pipelineStatus}</div>
              <div className="ds-type-xs-secondary">
                {isCompleted ? CLIENT_AUDIT_VIEW_COPY.links.pipelineReview : CLIENT_AUDIT_VIEW_COPY.links.pipelineFollow}
              </div>
            </div>
          </div>
          <CaretRight className="w-4 h-4 ds-text-brand"  />
        </Link>
      )}

      {isCreated && !canViewPipeline && !isFreeSnapshot && (
        <Callout intent="neutral" className="px-3 py-2">
          <p className="m-0 px-1 text-xs leading-relaxed text-[var(--text-quaternary)]">
            {CLIENT_AUDIT_VIEW_COPY.links.pipelineGateHint}
          </p>
        </Callout>
      )}
    </>
  );
}
