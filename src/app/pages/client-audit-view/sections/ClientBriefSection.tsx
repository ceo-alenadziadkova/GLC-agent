import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, Circle, ClipboardText, Spinner, Warning } from '@phosphor-icons/react';
import { readinessBadgeFromProgress } from '@glc/intake-core';
import { api } from '../../../data/apiService';
import { GLC_QUERY_STALE_TIME_MS_BRIEF } from '../../../config/query-client-defaults';
import { glcKeys } from '../../../lib/glc-keys';
import {
  countAnswered,
  pipelineRequiredIdsForProductMode,
  type BriefResponses,
} from '../../../data/briefQuestions';
import { effectiveBriefForPipelineGates } from '../../../data/intakeBriefMap';
import { useIntakeBankMetrics } from '../../../hooks/useIntakeWizard';
import { useBriefLayoutPrefsSync } from '../../../hooks/useBriefLayoutPrefsSync';
import {
  CLIENT_BRIEF_LAYOUT_DEFAULT_KEY,
  clearClientBriefLayout,
  clientBriefLayoutStorageKey,
  resolveClientBriefLayout,
  writeClientBriefLayout,
} from '../../../lib/client-brief-layout-preference';
import {
  INTAKE_BRIEF_SLA_PRODUCT_MODE,
  type IntakeBriefCollectionMode,
} from '../../../data/auditTypes';
import { IntakeBankCoverageHint } from '../../../components/IntakeBankCoverageHint';
import { labelsForMissingReportDomains } from '../../../lib/intake-coverage-domain-labels';
import { IntakeBankWizard } from '../../../components/IntakeBankWizard';
import { BankClassicBriefFields } from '../../../components/BankClassicBriefFields';
import { BriefLayoutPreferenceCards } from '../../../components/BriefLayoutPreferenceCards';
import { Callout } from '../../../components/ui/callout';
import { PORTAL_BRIEF_SAVED_FEEDBACK_MS } from '../../../lib/snapshot-polling-config';
import { toUiApiErrorMessage } from '../../../lib/api-error-ui';
import { CLIENT_AUDIT_VIEW_COPY } from '../../../config/client-audit-view-copy';
import { CLIENT_AUDIT_VIEW_UI } from '../config/ui';
import { BriefPipelineAnsweredTable } from '../../../components/BriefPipelineAnsweredTable';
import { INTAKE_DIAGNOSTIC_PILOT_COPY_EN } from '../../../config/intake-diagnostic-pilot-copy.en';
import { getQuestionLabel } from '../../../lib/intake-question-lookup';

export function ClientBriefSection({ auditId, onBriefSaved }: { auditId: string; onBriefSaved?: () => void }) {
  const queryClient = useQueryClient();
  const briefQuery = useQuery({
    queryKey: glcKeys.brief.detail(auditId),
    queryFn: () => api.getBrief(auditId),
    staleTime: GLC_QUERY_STALE_TIME_MS_BRIEF,
  });

  const [responses, setResponses] = useState<BriefResponses>({});
  const [intakeProgress, setIntakeProgress] = useState<{
    progressPct: number;
    readinessBadge: 'low' | 'medium' | 'high';
    nextBestAction: string;
  } | null>(null);
  const [missingRecommendedCount, setMissingRecommendedCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [briefError, setBriefError] = useState<string | null>(null);
  const [briefCollectionMode, setBriefCollectionMode] = useState<IntakeBriefCollectionMode | undefined>(undefined);
  const [briefLayoutChoice, setBriefLayoutChoice] = useState<'unset' | 'classic' | 'wizard'>(
    () => resolveClientBriefLayout(auditId) ?? 'unset',
  );

  useEffect(() => {
    setBriefLayoutChoice(resolveClientBriefLayout(auditId) ?? 'unset');
  }, [auditId]);

  const layoutSyncKeys = useMemo(
    () => [CLIENT_BRIEF_LAYOUT_DEFAULT_KEY, clientBriefLayoutStorageKey(auditId)],
    [auditId],
  );
  useBriefLayoutPrefsSync(layoutSyncKeys, () => {
    setBriefLayoutChoice(resolveClientBriefLayout(auditId) ?? 'unset');
  });

  useEffect(() => {
    const data = briefQuery.data;
    if (!data) return;
    if (data.brief?.responses) setResponses(data.brief.responses as BriefResponses);
    setBriefCollectionMode(data.brief?.collection_mode);
    if (data.intakeProgress) setIntakeProgress(data.intakeProgress);
    if (data.gates?.recommendedToImproveIds) setMissingRecommendedCount(data.gates.recommendedToImproveIds.length);
  }, [briefQuery.data]);

  const briefSlaMode: 'express' | 'full' = INTAKE_BRIEF_SLA_PRODUCT_MODE === 'express' ? 'express' : 'full';
  const effectiveBriefForGates = useMemo(() => effectiveBriefForPipelineGates(responses), [responses]);
  const pipelineRequiredIds = useMemo(
    () =>
      pipelineRequiredIdsForProductMode(
        briefSlaMode,
        effectiveBriefForGates,
        briefCollectionMode,
      ),
    [effectiveBriefForGates, briefCollectionMode, briefSlaMode],
  );

  const answeredRequired = countAnswered(effectiveBriefForGates, [...pipelineRequiredIds]);
  const pipelineRequiredTotal = pipelineRequiredIds.length;
  const answeredPipelineRequiredIds = useMemo(
    () => pipelineRequiredIds.filter(id => countAnswered(effectiveBriefForGates, [id]) > 0),
    [effectiveBriefForGates, pipelineRequiredIds],
  );
  const fallbackProgress = Math.min(
    100,
    Math.round((answeredRequired / Math.max(1, pipelineRequiredTotal)) * 100),
  );
  const progressPct = intakeProgress?.progressPct ?? fallbackProgress;
  const readinessBadge = intakeProgress?.readinessBadge ?? readinessBadgeFromProgress(fallbackProgress);

  const clientIntakeSurface =
    briefCollectionMode === 'discovery'
      ? undefined
      : briefCollectionMode === 'pre_brief'
        ? 'client_portal'
        : 'client_form';
  const bankMetrics = useIntakeBankMetrics(
    responses,
    briefCollectionMode,
    clientIntakeSurface,
    briefSlaMode,
  );

  async function handleSave() {
    setSaving(true);
    setBriefError(null);
    setSaved(false);
    try {
      await api.saveBrief(auditId, responses as Record<string, unknown>, {
        intake_versions: briefQuery.data?.brief?.intake_versions ?? undefined,
      });
      await queryClient.invalidateQueries({ queryKey: glcKeys.brief.detail(auditId) });
      setSaved(true);
      onBriefSaved?.();
      setTimeout(() => setSaved(false), PORTAL_BRIEF_SAVED_FEEDBACK_MS);
    } catch (error) {
      setBriefError(toUiApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  if (briefQuery.isPending && !briefQuery.data) return null;
  const layoutSelected = briefLayoutChoice === 'classic' || briefLayoutChoice === 'wizard';

  return (
    <div className="rounded-xl" style={CLIENT_AUDIT_VIEW_UI.brief.card}>
      <div className="px-5 py-4 mobile:px-4 flex items-center justify-between flex-wrap gap-2" style={CLIENT_AUDIT_VIEW_UI.brief.headerBorder}>
        <div className="flex items-center gap-2.5">
          <ClipboardText className="w-4 h-4 ds-text-brand"  />
          <h3 className="font-semibold text-sm ds-text-primary" >{CLIENT_AUDIT_VIEW_COPY.brief.title}</h3>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {layoutSelected && (
            <button
              type="button"
              onClick={() => {
                clearClientBriefLayout(auditId);
                setBriefLayoutChoice('unset');
              }}
              className="text-xs font-medium underline-offset-2 hover:underline"
              style={CLIENT_AUDIT_VIEW_UI.brief.linkButton}
            >
              {CLIENT_AUDIT_VIEW_COPY.brief.changeLayout}
            </button>
          )}
          {layoutSelected && (
            <div className="flex flex-col items-end gap-1">
              <span className="text-[length:var(--text-xs)] text-[var(--text-tertiary)]">
                {answeredRequired} / {pipelineRequiredTotal} {CLIENT_AUDIT_VIEW_COPY.brief.requiredAnsweredSuffix}
              </span>
              {answeredPipelineRequiredIds.length > 0 ? (
                <details className="ds-step2-brief-answered-details ds-client-brief-answered-details">
                  <summary>{CLIENT_AUDIT_VIEW_COPY.brief.reviewAnsweredRequired}</summary>
                  <BriefPipelineAnsweredTable
                    answeredIds={answeredPipelineRequiredIds}
                    responses={effectiveBriefForGates}
                    questionHeader={CLIENT_AUDIT_VIEW_COPY.brief.answeredTableQuestionCol}
                    answerHeader={CLIENT_AUDIT_VIEW_COPY.brief.answeredTableAnswerCol}
                    valueLabels={{
                      unknown: CLIENT_AUDIT_VIEW_COPY.brief.answeredValueUnknown,
                      yes: CLIENT_AUDIT_VIEW_COPY.brief.answeredValueYes,
                      no: CLIENT_AUDIT_VIEW_COPY.brief.answeredValueNo,
                      empty: CLIENT_AUDIT_VIEW_COPY.brief.answeredValueEmpty,
                    }}
                  />
                </details>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <div className="px-5 py-4 mobile:px-4 space-y-4">
        <p className="text-xs leading-relaxed ds-text-quaternary" >
          {CLIENT_AUDIT_VIEW_COPY.brief.defaultLayoutPrefix}{' '}
          <Link to="/settings#brief-layout" className="font-medium underline-offset-2 hover:underline ds-text-brand" >
            {CLIENT_AUDIT_VIEW_COPY.brief.settingsLink}
          </Link>
          {CLIENT_AUDIT_VIEW_COPY.brief.defaultLayoutSuffix}
        </p>
        {!layoutSelected && (
          <BriefLayoutPreferenceCards
            selected={null}
            onSelect={(mode) => {
              writeClientBriefLayout(auditId, mode);
              setBriefLayoutChoice(mode);
            }}
          />
        )}

        {layoutSelected && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-[length:var(--text-xs)] text-[var(--text-secondary)]">
                {CLIENT_AUDIT_VIEW_COPY.brief.readinessPrefix} {progressPct}%
              </span>
              <span className="px-2 py-0.5 rounded text-xs border border-[var(--border-subtle)] text-[var(--text-secondary)]">
                {readinessBadge.toUpperCase()}
              </span>
            </div>
            <div className="rounded-full overflow-hidden h-[length:var(--client-audit-brief-progress-track-height)] bg-[var(--bg-muted)]">
              <div
                className="h-full rounded-full"
                style={{
                  ...CLIENT_AUDIT_VIEW_UI.brief.progressFill,
                  transform: `scaleX(${progressPct / 100})`,
                  transition: CLIENT_AUDIT_VIEW_UI.brief.progressBarTransition,
                }}
              />
            </div>
            <IntakeBankCoverageHint
              dataQualityPct={bankMetrics.dataQualityPct}
              visibleRequiredAnswered={bankMetrics.visibleRequiredAnswered}
              visibleRequiredTotal={bankMetrics.visibleRequiredTotal}
              visibleRecommendedAnswered={bankMetrics.visibleRecommendedAnswered}
              visibleRecommendedTotal={bankMetrics.visibleRecommendedTotal}
              reportInputGapLabels={labelsForMissingReportDomains(bankMetrics.missingForReport)}
            />
            {briefLayoutChoice === 'wizard' &&
            briefQuery.data?.readiness?.auditReadinessStatus === 'blocked' ? (
              <Callout intent="warning">
                <div className="space-y-2 px-3 py-2 text-xs text-[var(--text-secondary)]">
                  <p className="font-semibold text-[var(--text-primary)]">
                    {INTAKE_DIAGNOSTIC_PILOT_COPY_EN.executionReadinessTitle}
                  </p>
                  <p>{INTAKE_DIAGNOSTIC_PILOT_COPY_EN.executionReadinessBlockedLead}</p>
                  {(briefQuery.data.readiness.trace ?? []).length > 0 ? (
                    <ul className="list-disc pl-4 space-y-1">
                      {(briefQuery.data.readiness.trace ?? []).map((t, i) => (
                        <li key={`${t.code}-${i}`}>{t.semanticCause}</li>
                      ))}
                    </ul>
                  ) : null}
                  {briefQuery.data.remediation_queue != null && briefQuery.data.remediation_queue.length > 0 ? (
                    <div>
                      <p className="font-medium text-[var(--text-primary)]">
                        {INTAKE_DIAGNOSTIC_PILOT_COPY_EN.remediationTitle}
                      </p>
                      <ul className="list-disc pl-4 space-y-1">
                        {briefQuery.data.remediation_queue.map(id => (
                          <li key={id}>{getQuestionLabel(id)}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </Callout>
            ) : null}
            <p className="text-[length:var(--text-xs)] text-[var(--text-tertiary)]">
              {CLIENT_AUDIT_VIEW_COPY.brief.helpTailoringPrefix}{' '}
              <span className="inline-flex items-center gap-0.5 text-[var(--score-1)]">
                <Circle size={6} weight="fill" />
                {CLIENT_AUDIT_VIEW_COPY.brief.requiredLabel}
              </span>{' '}
              {CLIENT_AUDIT_VIEW_COPY.brief.helpTailoringSuffix}
            </p>
            <p className="text-[length:var(--text-xs)] text-[var(--text-tertiary)]">
              {CLIENT_AUDIT_VIEW_COPY.brief.improveQualityPrefix} {missingRecommendedCount}{' '}
              {CLIENT_AUDIT_VIEW_COPY.brief.improveQualitySuffix}
            </p>
            <div className="overflow-y-auto pr-1 -mr-1" style={{ maxHeight: CLIENT_AUDIT_VIEW_UI.brief.formMaxHeight }}>
              {briefLayoutChoice === 'wizard' ? (
                <IntakeBankWizard
                  responses={responses}
                  onResponsesChange={(next) => setResponses(next)}
                  interviewMode={false}
                  emphasizeClientSource={false}
                  answerSource="client"
                  collectionMode={briefCollectionMode}
                  intakeSurface={clientIntakeSurface}
                  intakeAnalytics={
                    clientIntakeSurface
                      ? {
                          auditId,
                          surface: clientIntakeSurface,
                          getIntakeVersions: () => briefQuery.data?.brief?.intake_versions ?? null,
                        }
                      : undefined
                  }
                  productMode={briefSlaMode}
                />
              ) : (
                <BankClassicBriefFields
                  compact
                  responses={responses}
                  collectionMode={briefCollectionMode}
                  intakeSurface={clientIntakeSurface}
                  productMode={briefSlaMode}
                  onChange={(qid, value) =>
                    setResponses((prev) => ({ ...prev, [qid]: { value, source: 'client' } }))
                  }
                  onSetUnknown={(qid) =>
                    setResponses((prev) => ({ ...prev, [qid]: { value: null, source: 'unknown' } }))
                  }
                  interviewMode={false}
                  emphasizeClientSource={false}
                />
              )}
            </div>
            {briefError && (
              <Callout intent="danger">
                <div className="flex items-center gap-2 px-3 py-2 text-xs text-[var(--score-1)]">
                  <Warning className="h-3.5 w-3.5" />
                  {briefError}
                </div>
              </Callout>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="w-full py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
              style={{
                ...CLIENT_AUDIT_VIEW_UI.brief.saveButton,
                cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? (
                <><Spinner className="w-3.5 h-3.5 animate-spin" /> {CLIENT_AUDIT_VIEW_COPY.brief.saving}</>
              ) : saved ? (
                <><CheckCircle weight="fill" className="w-3.5 h-3.5" /> {CLIENT_AUDIT_VIEW_COPY.brief.saved}</>
              ) : (
                CLIENT_AUDIT_VIEW_COPY.brief.save
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
