import { ChartBar, CheckCircle, Rocket, Spinner, Warning } from '@phosphor-icons/react';
import { Link } from 'react-router';
import type { AuditCoveragePackage, FreeSnapshotPreview } from '../../../data/auditTypes';
import { AUDIT_COVERAGE_PACKAGES } from '../../../data/auditTypes';
import { coveragePackageLabel } from '../../../lib/audit-execution-plan';
import { PortalSnapshotAccountMirror } from '../../../components/PortalSnapshotAccountMirror';
import { Callout } from '../../../components/ui/callout';
import { Surface } from '../../../components/ui/surface';
import { CLIENT_AUDIT_VIEW_COPY } from '../../../config/client-audit-view-copy';
import { CLIENT_PORTAL_PRODUCT_MODE_HELP } from '../../../lib/client-portal-pipeline-access';
import { UI_SEMANTIC_COLORS } from '../../../../design-system/tokens/ui-semantic-colors';
import { CLIENT_AUDIT_VIEW_UI } from '../config/ui';

type SnapshotAccessState = {
  showCallout: boolean;
  robotsLimitedSample: boolean;
} | null;

export function SnapshotUpgradeSection({
  snapshotPreview,
  freeSnapshotAccess,
  upgradeCoveragePackage,
  setUpgradeCoveragePackage,
  upgradeBusy,
  upgradeError,
  onUpgrade,
}: {
  snapshotPreview: FreeSnapshotPreview | null;
  freeSnapshotAccess: SnapshotAccessState;
  upgradeCoveragePackage: AuditCoveragePackage;
  setUpgradeCoveragePackage: (next: AuditCoveragePackage) => void;
  upgradeBusy: boolean;
  upgradeError: string | null;
  onUpgrade: (useScrapedContext: boolean) => Promise<void>;
}) {
  return (
    <div
      className="rounded-xl overflow-hidden space-y-4 px-5 py-5 mobile:px-4 mobile:py-4"
      style={
        freeSnapshotAccess?.showCallout
          ? CLIENT_AUDIT_VIEW_UI.snapshot.panelLimited
          : CLIENT_AUDIT_VIEW_UI.snapshot.panelNormal
      }
    >
      <div className="flex items-start gap-3">
        <ChartBar className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--glc-blue)' }} />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
            {freeSnapshotAccess?.showCallout ? CLIENT_AUDIT_VIEW_COPY.snapshot.limitedTitle : CLIENT_AUDIT_VIEW_COPY.snapshot.normalTitle}
          </div>
          <p className="text-xs m-0 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {freeSnapshotAccess?.showCallout ? (
              <>
                {CLIENT_AUDIT_VIEW_COPY.snapshot.limitedBodyPrefix}{' '}
                <Link to="/snapshot" className="font-semibold underline-offset-2 hover:underline" style={{ color: 'var(--glc-blue)' }}>
                  {CLIENT_AUDIT_VIEW_COPY.snapshot.rerunLink}
                </Link>{' '}
                {CLIENT_AUDIT_VIEW_COPY.snapshot.limitedBodySuffix}
              </>
            ) : (
              <>{CLIENT_AUDIT_VIEW_COPY.snapshot.normalBody}</>
            )}
          </p>
        </div>
        {freeSnapshotAccess?.showCallout ? (
          <Warning weight="fill" className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--score-2)' }} />
        ) : (
          <CheckCircle weight="fill" className="w-5 h-5 flex-shrink-0" style={{ color: UI_SEMANTIC_COLORS.success }} />
        )}
      </div>

      {snapshotPreview ? (
        <PortalSnapshotAccountMirror result={snapshotPreview} />
      ) : (
        <p className="text-xs m-0" style={{ color: 'var(--text-quaternary)' }}>
          {CLIENT_AUDIT_VIEW_COPY.snapshot.missingMirror}
        </p>
      )}

      <div className="space-y-4 border-t pt-4" style={{ borderColor: CLIENT_AUDIT_VIEW_UI.snapshot.dividerBorderColor }}>
        <div>
          <div className="text-xs font-medium mb-2" style={{ color: 'var(--text-tertiary)' }}>
            {CLIENT_AUDIT_VIEW_COPY.snapshot.continuePackage}
          </div>
          <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'var(--border-subtle)' }}>
            {AUDIT_COVERAGE_PACKAGES.map((pkg) => (
              <button
                key={pkg}
                type="button"
                disabled={upgradeBusy}
                onClick={() => setUpgradeCoveragePackage(pkg)}
                className="flex-1 py-2 text-xs font-medium"
                style={{
                  background: upgradeCoveragePackage === pkg ? CLIENT_AUDIT_VIEW_UI.snapshot.packageButtonActiveBg : 'var(--bg-muted)',
                  color: 'var(--text-primary)',
                  border: 'none',
                  cursor: upgradeBusy ? 'not-allowed' : 'pointer',
                }}
              >
                {coveragePackageLabel(pkg)}
              </button>
            ))}
          </div>
          <p className="text-xs m-0 mt-2 leading-relaxed" style={{ color: 'var(--text-quaternary)' }}>
            {CLIENT_AUDIT_VIEW_COPY.snapshot.selectedPackageHint}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <PackageCard active={upgradeCoveragePackage === 'starter'} label={CLIENT_PORTAL_PRODUCT_MODE_HELP.starter.label} summary={CLIENT_PORTAL_PRODUCT_MODE_HELP.starter.summary} detail={CLIENT_PORTAL_PRODUCT_MODE_HELP.starter.detail} />
          <PackageCard active={upgradeCoveragePackage === 'pro'} label={CLIENT_PORTAL_PRODUCT_MODE_HELP.pro.label} summary={CLIENT_PORTAL_PRODUCT_MODE_HELP.pro.summary} detail={CLIENT_PORTAL_PRODUCT_MODE_HELP.pro.detail} />
          <PackageCard active={upgradeCoveragePackage === 'complete'} label={CLIENT_PORTAL_PRODUCT_MODE_HELP.complete.label} summary={CLIENT_PORTAL_PRODUCT_MODE_HELP.complete.summary} detail={CLIENT_PORTAL_PRODUCT_MODE_HELP.complete.detail} />
        </div>

        {upgradeError && (
          <Callout intent="danger">
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-[var(--score-1)]">
              <Warning className="h-3.5 w-3.5 flex-shrink-0" />
              {upgradeError}
            </div>
          </Callout>
        )}

        <div className="space-y-2">
          {freeSnapshotAccess?.showCallout ? (
            <Callout intent="warning" className="px-3 py-2.5">
              <p className="m-0 text-xs leading-relaxed text-[var(--text-secondary)]">
                {CLIENT_AUDIT_VIEW_COPY.snapshot.limitedContinueHint}{' '}
                <strong className="text-[var(--text-primary)]">{CLIENT_AUDIT_VIEW_COPY.snapshot.startFreshStrong}</strong>{' '}
                {CLIENT_AUDIT_VIEW_COPY.snapshot.limitedContinueHintSuffix}
              </p>
            </Callout>
          ) : null}
          <button
            type="button"
            disabled={upgradeBusy}
            onClick={() => void onUpgrade(true)}
            className="w-full py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
            style={{
              background: upgradeBusy ? 'var(--bg-muted)' : 'var(--gradient-brand)',
              color: upgradeBusy ? 'var(--text-quaternary)' : 'var(--glc-ink)',
              cursor: upgradeBusy ? 'not-allowed' : 'pointer',
              boxShadow: upgradeBusy ? 'none' : 'var(--glow-blue-sm)',
              border: 'none',
            }}
          >
            {upgradeBusy ? <Spinner className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
            {freeSnapshotAccess?.showCallout ? CLIENT_AUDIT_VIEW_COPY.snapshot.continueLimited : CLIENT_AUDIT_VIEW_COPY.snapshot.continueDetected}
          </button>
          <Surface padding="none" className="space-y-2 rounded-lg bg-[var(--bg-inset)] px-3 py-2.5">
            <p className="m-0 text-xs font-medium text-[var(--text-secondary)]">
              {CLIENT_AUDIT_VIEW_COPY.upgrade.prefillTitle}
            </p>
            <ul className="m-0 list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-[var(--text-tertiary)]">
              <li>{CLIENT_AUDIT_VIEW_COPY.upgrade.prefillItems.techStack}</li>
              <li>{CLIENT_AUDIT_VIEW_COPY.upgrade.prefillItems.siteProfile}</li>
              <li>{CLIENT_AUDIT_VIEW_COPY.upgrade.prefillItems.homepageCopy}</li>
              <li>{CLIENT_AUDIT_VIEW_COPY.upgrade.prefillItems.businessActivityDraft}</li>
              <li>{CLIENT_AUDIT_VIEW_COPY.upgrade.prefillItems.scoreHint}</li>
              <li>{CLIENT_AUDIT_VIEW_COPY.upgrade.prefillItems.analytics}</li>
            </ul>
            <p className="m-0 text-xs leading-relaxed text-[var(--text-quaternary)]">
              {upgradeCoveragePackage === 'starter'
                ? CLIENT_AUDIT_VIEW_COPY.upgrade.packageContextByCoverage.starter
                : upgradeCoveragePackage === 'pro'
                  ? CLIENT_AUDIT_VIEW_COPY.upgrade.packageContextByCoverage.pro
                  : CLIENT_AUDIT_VIEW_COPY.upgrade.packageContextByCoverage.complete}{' '}
              {CLIENT_AUDIT_VIEW_COPY.snapshot.prefillEditSuffix}
            </p>
          </Surface>

          <button
            type="button"
            disabled={upgradeBusy}
            onClick={() => void onUpgrade(false)}
            className="w-full py-2.5 rounded-lg text-sm font-medium"
            style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', cursor: upgradeBusy ? 'not-allowed' : 'pointer' }}
          >
            {CLIENT_AUDIT_VIEW_COPY.snapshot.startFresh}
          </button>
          <p className="text-xs m-0 leading-relaxed" style={{ color: 'var(--text-quaternary)' }}>
            {CLIENT_AUDIT_VIEW_COPY.snapshot.startFreshBodyPrefix}
            {` ${coveragePackageLabel(upgradeCoveragePackage)} `}
            {CLIENT_AUDIT_VIEW_COPY.snapshot.startFreshBodyMiddle}
          </p>
        </div>
      </div>
    </div>
  );
}

function PackageCard({ active, label, summary, detail }: { active: boolean; label: string; summary: string; detail: string }) {
  return (
    <div className="rounded-lg px-3 py-2.5 text-xs" style={{ background: 'var(--bg-surface)', border: active ? CLIENT_AUDIT_VIEW_UI.snapshot.packageCardActiveBorder : '1px solid var(--border-subtle)' }}>
      <div className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{label}</div>
      <p className="m-0 mb-1.5" style={{ color: 'var(--text-secondary)' }}>{summary}</p>
      <p className="m-0" style={{ color: 'var(--text-quaternary)' }}>{detail}</p>
    </div>
  );
}
