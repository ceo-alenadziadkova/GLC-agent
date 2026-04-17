import { motion } from 'motion/react';
import { CheckCircle, Clock } from '@phosphor-icons/react';
import type { IntakeClientMetadata } from '../../../lib/intake-client-copy';
import { WORKSPACE_PAGE_COPY } from '../../../config/workspace-page-copy';
import { formatIntakeBriefSavedAt } from '../../../lib/format-intake-dates';
import { replaceIntakePublicCopyPlaceholders } from '../lib/intake-public-copy-helpers';

const copy = WORKSPACE_PAGE_COPY.intakePublicPrebrief;
const defaultWindow = WORKSPACE_PAGE_COPY.intakeClient.defaultExpectedContactWindow;

export function IntakeBriefSuccessPhase(props: {
  lastSubmittedIso: string;
  successIsUpdate: boolean;
  clientMeta: IntakeClientMetadata;
  consultantLabel: string;
  followUpLine: string | null;
  contactFooter: string[];
}) {
  const {
    lastSubmittedIso,
    successIsUpdate,
    clientMeta,
    consultantLabel,
    followUpLine,
    contactFooter,
  } = props;

  const consultantNamed = clientMeta.consultant_name?.trim();

  return (
    <motion.div
      key="success"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full space-y-6 text-left"
    >
      <div className="text-center">
        <CheckCircle className="w-12 h-12 mx-auto mb-1 text-[var(--glc-green)]" weight="fill" />
      </div>

      <div className="glc-card overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border-subtle)] shadow-[var(--shadow-lg)]">
        <div className="px-5 py-4 border-b border-[var(--border-subtle)] bg-[linear-gradient(180deg,var(--glc-green-alpha-06)_0%,transparent_100%)]">
          <p className="text-xs font-semibold uppercase tracking-[var(--tracking-drawer-caps)] text-[var(--glc-green)] mb-1.5">
            {successIsUpdate ? copy.successBadgeUpdate : copy.successBadgeNew}
          </p>
          <h2 className="font-[family-name:var(--font-display)] font-bold text-[length:var(--text-xl)] text-[var(--text-primary)] tracking-[var(--tracking-tight)] leading-tight">
            {successIsUpdate ? copy.successTitleUpdate : copy.successTitleNew}
          </h2>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="flex items-start gap-3 rounded-xl px-3 py-3 bg-[var(--bg-inset)] border border-[var(--border-subtle)]">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
              <Clock className="h-4 w-4 ds-text-tertiary"  />
            </div>
            <div className="min-w-0 pt-0.5">
              <p className="text-[length:var(--text-2xs)] font-semibold uppercase tracking-wider text-[var(--text-quaternary)] mb-0.5">
                {successIsUpdate ? copy.successTimeLabelUpdate : copy.successTimeLabelNew}
              </p>
              <p className="text-sm font-medium tabular-nums text-[var(--text-primary)]">
                {formatIntakeBriefSavedAt(lastSubmittedIso)}
              </p>
            </div>
          </div>

          {successIsUpdate ? (
            <p className="text-sm leading-relaxed m-0 ds-text-secondary" >
              <span className="text-[var(--text-primary)] font-semibold">
                {consultantNamed || consultantLabel}
              </span>{' '}
              {copy.successUpdateAfterName}
            </p>
          ) : (
            <>
              <p className="text-sm leading-relaxed m-0 ds-text-secondary" >
                {consultantNamed ? (
                  <>
                    <span className="text-[var(--text-primary)] font-semibold">{consultantNamed}</span>{' '}
                    {copy.successNewAfterName}
                  </>
                ) : (
                  copy.successNewAnonymous
                )}
              </p>
              {followUpLine ? (
                <p className="text-sm leading-relaxed m-0 ds-text-secondary" >
                  {followUpLine}
                </p>
              ) : (
                <p className="text-sm leading-relaxed m-0 ds-text-secondary" >
                  {consultantNamed
                    ? replaceIntakePublicCopyPlaceholders(copy.followUpFallbackNamed, {
                        name: consultantNamed,
                        window: defaultWindow,
                      })
                    : replaceIntakePublicCopyPlaceholders(copy.followUpFallbackAnonymous, {
                        window: defaultWindow,
                      })}
                </p>
              )}
              {contactFooter.length > 0 && (
                <div className="rounded-xl px-3 py-3 bg-[var(--bg-inset)] border border-[var(--border-subtle)]">
                  <p
                    className="text-[length:var(--text-2xs)] font-semibold uppercase tracking-wider m-0 mb-2 ds-text-quaternary"
                    
                  >
                    {copy.contactHeading}
                  </p>
                  <ul className="text-sm space-y-1.5 m-0 pl-0 list-none ds-text-secondary" >
                    {contactFooter.map(line => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
