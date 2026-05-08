import { CaretRight, CheckCircle, ClipboardText, FileText, Flask, Path, Pulse } from '@phosphor-icons/react';
import { Link } from 'react-router';
import { Callout } from '../../../components/ui/callout';
import { CLIENT_AUDIT_VIEW_COPY } from '../../../config/client-audit-view-copy';
import { ORCHESTRATION_IA_COPY } from '../../../config/orchestration-roadmap-ui-copy.en';
import { COLOR_TOKENS } from '../../../../design-system/tokens/colors';
import { CLIENT_AUDIT_VIEW_UI } from '../config/ui';
import { buildAppRoute } from '../../../config/route-paths';
import { APP_FEATURE_FLAGS } from '../../../config/app-feature-flags';
import { buildPlanWorkspaceHref } from '../../../lib/plan-cross-nav';

export function NavigationLinksSection({
  auditId,
  canViewPipeline,
  isCreated,
  isFreeSnapshot,
  isCompleted,
  hasStrategy,
}: {
  auditId: string;
  canViewPipeline: boolean;
  isCreated: boolean;
  isFreeSnapshot: boolean;
  isCompleted: boolean;
  hasStrategy: boolean;
}) {
  return (
    <>
      {isCompleted && !isFreeSnapshot && APP_FEATURE_FLAGS.clientPlanWorkspaceEnabled && (
        <>
          <Link
            to={buildAppRoute.portalPlan(auditId)}
            className="flex items-center justify-between gap-3 rounded-xl px-5 py-4 no-underline transition-all mobile:px-4"
            style={CLIENT_AUDIT_VIEW_UI.links.reportCard}
          >
            <div className="min-w-0 flex items-center gap-3">
              <Path className="h-5 w-5 flex-shrink-0 ds-text-brand" />
              <div>
                <div className="font-medium text-sm ds-text-primary">{CLIENT_AUDIT_VIEW_COPY.links.viewTimeline}</div>
                <div className="ds-type-xs-secondary">{ORCHESTRATION_IA_COPY.clientNavTimelineCardSubtitle}</div>
              </div>
            </div>
            <CheckCircle weight="fill" className="h-5 w-5" color={COLOR_TOKENS.semantic.uiSemantic.success} />
          </Link>
          <Link
            to={buildAppRoute.portalReports(auditId)}
            className="flex items-center justify-between gap-3 px-5 py-4 mobile:px-4 rounded-xl no-underline transition-all"
            style={CLIENT_AUDIT_VIEW_UI.links.reportCard}
          >
            <div className="flex items-center gap-3 min-w-0">
              <FileText className="w-5 h-5 flex-shrink-0 ds-text-brand" />
              <div>
                <div className="font-medium text-sm ds-text-primary">{CLIENT_AUDIT_VIEW_COPY.links.viewReport}</div>
                <div className="ds-type-xs-secondary">{CLIENT_AUDIT_VIEW_COPY.links.reportFinished}</div>
              </div>
            </div>
            <CheckCircle weight="fill" className="w-5 h-5" color={COLOR_TOKENS.semantic.uiSemantic.success} />
          </Link>
          {hasStrategy &&
            APP_FEATURE_FLAGS.orchestrationRoadmapUiEnabled &&
            APP_FEATURE_FLAGS.clientRoadmapManifestWizardEnabled ? (
            <Link
              to={buildAppRoute.portalRoadmapManifest(auditId)}
              className="flex items-center justify-between gap-3 rounded-xl px-5 py-4 no-underline transition-all mobile:px-4"
              style={CLIENT_AUDIT_VIEW_UI.links.reportCard}
            >
              <div className="flex min-w-0 items-center gap-3">
                <ClipboardText className="h-5 w-5 flex-shrink-0 ds-text-brand" />
                <div>
                  <div className="text-sm font-medium ds-text-primary">
                    {CLIENT_AUDIT_VIEW_COPY.links.viewRoadmapManifestWizard}
                  </div>
                  <div className="ds-type-xs-secondary">{CLIENT_AUDIT_VIEW_COPY.links.viewRoadmapManifestWizardSubtitle}</div>
                </div>
              </div>
              <CheckCircle weight="fill" className="h-5 w-5" color={COLOR_TOKENS.semantic.uiSemantic.success} />
            </Link>
          ) : null}
          {hasStrategy && (
            <Link
              to={buildPlanWorkspaceHref({
                auditId,
                isClient: true,
                mode: 'shape',
              })}
              className="flex items-center justify-between gap-3 px-5 py-4 mobile:px-4 rounded-xl no-underline transition-all"
              style={CLIENT_AUDIT_VIEW_UI.links.reportCard}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Flask className="w-5 h-5 flex-shrink-0 ds-text-brand" />
                <div>
                  <div className="font-medium text-sm ds-text-primary">{CLIENT_AUDIT_VIEW_COPY.links.viewStrategyLab}</div>
                  <div className="ds-type-xs-secondary">{ORCHESTRATION_IA_COPY.clientNavLabCardSubtitle}</div>
                </div>
              </div>
              <CheckCircle weight="fill" className="w-5 h-5" color={COLOR_TOKENS.semantic.uiSemantic.success} />
            </Link>
          )}
        </>
      )}

      {canViewPipeline && (
        <Link
          to={buildAppRoute.portalPipeline(auditId)}
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
