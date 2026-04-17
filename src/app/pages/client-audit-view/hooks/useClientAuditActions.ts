import { useState } from 'react';
import { useNavigate } from 'react-router';
import { api } from '../../../data/apiService';
import { getGlcQueryClient } from '../../../lib/glc-query-client';
import { invalidateAuditRelatedQueries } from '../../../lib/glc-invalidate-queries';
import { toUiApiErrorMessage } from '../../../lib/api-error-ui';
import type { AuditCoveragePackage } from '../../../data/auditTypes';
import { CLIENT_AUDIT_VIEW_DEFAULT_UPGRADE_COVERAGE_PACKAGE } from '../../../config/client-audit-view-copy';

export function useClientAuditActions(auditId: string) {
  const navigate = useNavigate();
  const [startError, setStartError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [helpMessage, setHelpMessage] = useState('');
  const [helpBusy, setHelpBusy] = useState(false);
  const [helpOk, setHelpOk] = useState(false);
  const [helpError, setHelpError] = useState<string | null>(null);
  const [upgradeCoveragePackage, setUpgradeCoveragePackage] = useState<AuditCoveragePackage>(
    CLIENT_AUDIT_VIEW_DEFAULT_UPGRADE_COVERAGE_PACKAGE,
  );
  const [upgradeBusy, setUpgradeBusy] = useState(false);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);

  async function handleStart() {
    setStarting(true);
    setStartError(null);
    try {
      await api.startPipeline(auditId);
      invalidateAuditRelatedQueries(getGlcQueryClient(), auditId);
      navigate(`/portal/pipeline/${auditId}`);
    } catch (error) {
      setStartError(toUiApiErrorMessage(error));
    } finally {
      setStarting(false);
    }
  }

  async function handleHelp() {
    setHelpBusy(true);
    setHelpError(null);
    setHelpOk(false);
    try {
      await api.requestBriefHelp(auditId, helpMessage);
      setHelpOk(true);
      setHelpMessage('');
    } catch (error) {
      setHelpError(toUiApiErrorMessage(error));
    } finally {
      setHelpBusy(false);
    }
  }

  async function handleUpgradeFromSnapshot(useScrapedContext: boolean) {
    setUpgradeBusy(true);
    setUpgradeError(null);
    try {
      await api.upgradeAuditFromSnapshot(auditId, {
        coverage_package: upgradeCoveragePackage,
        use_scraped_context: useScrapedContext,
      });
      invalidateAuditRelatedQueries(getGlcQueryClient(), auditId);
    } catch (error) {
      setUpgradeError(toUiApiErrorMessage(error));
    } finally {
      setUpgradeBusy(false);
    }
  }

  return {
    startError,
    starting,
    handleStart,
    helpMessage,
    setHelpMessage,
    helpBusy,
    helpOk,
    helpError,
    handleHelp,
    upgradeCoveragePackage,
    setUpgradeCoveragePackage,
    upgradeBusy,
    upgradeError,
    handleUpgradeFromSnapshot,
  };
}
