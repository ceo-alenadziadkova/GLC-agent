import { CaretDoubleLeft, CaretRight } from '@phosphor-icons/react';
import { Link } from 'react-router';
import { ScoreRing } from '../../../components/glc/ScoreBadge';
import { IntakeBankCoverageHint } from '../../../components/IntakeBankCoverageHint';
import { IntakeBankWizard } from '../../../components/IntakeBankWizard';
import { BankClassicBriefFields } from '../../../components/BankClassicBriefFields';
import { BriefLayoutPreferenceCards } from '../../../components/BriefLayoutPreferenceCards';
import { AUDIT_WORKSPACE_COPY } from '../../../config/audit-workspace-copy.en';
import { INTAKE_BRIEF_SLA_PRODUCT_MODE, type AuditState, type DomainKey } from '../../../data/auditTypes';
import type { BriefResponses } from '../../../data/briefQuestions';
import { labelsForMissingReportDomains } from '../../../lib/intake-coverage-domain-labels';
import type { useIntakeBankMetrics } from '../../../hooks/useIntakeWizard';
import { AUDIT_WORKSPACE_UI } from '../config/ui';
import { cn } from '../../../components/ui/utils';
import { DomainNav } from './DomainNav';

type BriefLayoutChoice = 'unset' | 'classic' | 'wizard';
type BankMetrics = ReturnType<typeof useIntakeBankMetrics>;

type Props = {
  id?: string;
  audit: AuditState;
  overallScore: number;
  domainCount: number;
  briefPanelOpen: boolean;
  setBriefPanelOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  briefLayoutChoice: BriefLayoutChoice;
  selectBriefLayout: (mode: Exclude<BriefLayoutChoice, 'unset'>) => void;
  clearBriefLayout: () => void;
  workspaceBriefResponses: BriefResponses;
  workspaceBriefSavedFlash: boolean;
  onWizardResponsesChange: (next: BriefResponses) => void;
  onFieldChange: (qid: string, value: string | string[] | number | null) => void;
  onFieldUnknown: (qid: string) => void;
  visibleDomainKeys: readonly DomainKey[];
  activeDomain: DomainKey;
  setActiveDomain: (value: DomainKey) => void;
  resetOpenRecommendation: () => void;
  workspaceConsultantSurface: 'consultant_interview' | undefined;
  bankMetrics: BankMetrics;
  /** When true, sidebar fills the resizable panel (desktop); otherwise fixed CSS width (mobile). */
  fillParentWidth?: boolean;
  /** Desktop: collapse the resizable sidebar panel. */
  onRequestCollapse?: () => void;
};

export function WorkspaceSidebar({
  id,
  audit,
  overallScore,
  domainCount,
  briefPanelOpen,
  setBriefPanelOpen,
  briefLayoutChoice,
  selectBriefLayout,
  clearBriefLayout,
  workspaceBriefResponses,
  workspaceBriefSavedFlash,
  onWizardResponsesChange,
  onFieldChange,
  onFieldUnknown,
  visibleDomainKeys,
  activeDomain,
  setActiveDomain,
  resetOpenRecommendation,
  workspaceConsultantSurface,
  bankMetrics,
  fillParentWidth = false,
  onRequestCollapse,
}: Props) {
  return (
    <aside
      className={cn(
        fillParentWidth ? 'h-full w-full min-w-0 border-r border-[var(--border-subtle)]' : AUDIT_WORKSPACE_UI.layout.sidebarWidthClass,
        'flex-shrink-0 overflow-y-auto flex flex-col ds-workspace-sidebar-aside',
      )}
    >
      <div className="flex items-center gap-3 border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-4">
        <ScoreRing score={overallScore} size={AUDIT_WORKSPACE_UI.scoreRingSize} />
        <div className="min-w-0 flex-1">
          <p
            className="text-sm font-bold [font-family:var(--font-display)] ds-letterspace-tight-01 text-[var(--text-primary)]"
          >
            {AUDIT_WORKSPACE_COPY.sidebar.overallScore}
          </p>
          <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
            {domainCount} {AUDIT_WORKSPACE_COPY.sidebar.domainsAnalyzedSuffix}
          </p>
        </div>
        {onRequestCollapse ? (
          <button
            type="button"
            onClick={onRequestCollapse}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border-0 bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
            aria-label={AUDIT_WORKSPACE_COPY.sidebar.collapseSidebar}
          >
            <CaretDoubleLeft className="h-4 w-4" aria-hidden />
          </button>
        ) : null}
      </div>

      {audit.brief && (
        <>
          <div className="border-b border-[var(--border-subtle)] px-4 py-3">
            <IntakeBankCoverageHint
              dataQualityPct={bankMetrics.dataQualityPct}
              visibleRequiredAnswered={bankMetrics.visibleRequiredAnswered}
              visibleRequiredTotal={bankMetrics.visibleRequiredTotal}
              visibleRecommendedAnswered={bankMetrics.visibleRecommendedAnswered}
              visibleRecommendedTotal={bankMetrics.visibleRecommendedTotal}
              reportInputGapLabels={labelsForMissingReportDomains(bankMetrics.missingForReport)}
            />
          </div>
          <div className="border-b border-[var(--border-subtle)]">
            <button
              type="button"
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs font-semibold text-[var(--text-secondary)]"
              onClick={() => setBriefPanelOpen(prev => !prev)}
            >
              <CaretRight
                className={cn(
                  'w-3.5 h-3.5 flex-shrink-0 transition-transform text-[var(--glc-blue)]',
                  briefPanelOpen && 'rotate-90',
                )}
              />
              {AUDIT_WORKSPACE_COPY.sidebar.editIntakeBrief}
            </button>
            {briefPanelOpen && (
              <div className={`px-3 pb-3 space-y-2 ${AUDIT_WORKSPACE_UI.layout.briefPanelMaxHeightClass} overflow-y-auto`}>
                {workspaceBriefSavedFlash && (
                  <p className="text-[length:var(--text-2xs)] font-medium text-[var(--glc-green)]">
                    {AUDIT_WORKSPACE_COPY.sidebar.briefSaved}
                  </p>
                )}
                <p className="text-[length:var(--text-2xs)] leading-snug text-[var(--text-quaternary)]">
                  {AUDIT_WORKSPACE_COPY.sidebar.defaultLayoutPrefix}{' '}
                  <Link
                    to="/settings#brief-layout"
                    className="font-medium text-[var(--glc-blue)] underline-offset-2 hover:underline"
                  >
                    {AUDIT_WORKSPACE_COPY.sidebar.settingsLink}
                  </Link>
                </p>
                {briefLayoutChoice === 'unset' ? (
                  <BriefLayoutPreferenceCards selected={null} onSelect={selectBriefLayout} />
                ) : (
                  <>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={clearBriefLayout}
                        className="cursor-pointer border-0 bg-none p-0 text-[length:var(--text-2xs)] font-medium text-[var(--glc-blue)] underline-offset-2 hover:underline"
                      >
                        {AUDIT_WORKSPACE_COPY.sidebar.changeLayout}
                      </button>
                    </div>
                    {briefLayoutChoice === 'wizard' ? (
                      <IntakeBankWizard
                        responses={workspaceBriefResponses}
                        onResponsesChange={onWizardResponsesChange}
                        interviewMode={false}
                        emphasizeClientSource={false}
                        answerSource="consultant"
                        collectionMode={audit.brief.collection_mode}
                        intakeSurface={workspaceConsultantSurface}
                        intakeAnalytics={
                          id && workspaceConsultantSurface && audit.brief
                            ? {
                                auditId: id,
                                surface: workspaceConsultantSurface,
                                getIntakeVersions: () => audit.brief?.intake_versions ?? null,
                              }
                            : undefined
                        }
                        productMode={INTAKE_BRIEF_SLA_PRODUCT_MODE}
                      />
                    ) : (
                      <BankClassicBriefFields
                        compact
                        responses={workspaceBriefResponses}
                        collectionMode={audit.brief.collection_mode}
                        intakeSurface={workspaceConsultantSurface}
                        productMode={INTAKE_BRIEF_SLA_PRODUCT_MODE}
                        onChange={onFieldChange}
                        onSetUnknown={onFieldUnknown}
                      />
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </>
      )}

      <DomainNav
        audit={audit}
        visibleDomainKeys={visibleDomainKeys}
        activeDomain={activeDomain}
        setActiveDomain={setActiveDomain}
        resetOpenRecommendation={resetOpenRecommendation}
      />
    </aside>
  );
}
