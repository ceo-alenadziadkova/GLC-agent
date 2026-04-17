import type { Dispatch, SetStateAction, ReactNode } from 'react';
import { Copy, X } from '@phosphor-icons/react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { INDUSTRY_OPTIONS } from '../../../data/industry-options';
import { WORKSPACE_PAGE_COPY } from '../../../config/workspace-page-copy';
import { Callout } from '../../../components/ui/callout';
import { FormField } from '../../../components/ui/form-field';
import { cn } from '../../../components/ui/utils';

export type PreBriefModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreate: () => void | Promise<void>;

  // Controlled form fields
  company: string;
  setCompany: Dispatch<SetStateAction<string>>;
  website: string;
  setWebsite: Dispatch<SetStateAction<string>>;
  industryField: string;
  setIndustryField: Dispatch<SetStateAction<string>>;
  industrySpecify: string;
  setIndustrySpecify: Dispatch<SetStateAction<string>>;
  message: string;
  setMessage: Dispatch<SetStateAction<string>>;
  consultantName: string;
  setConsultantName: Dispatch<SetStateAction<string>>;
  expectedContact: string;
  setExpectedContact: Dispatch<SetStateAction<string>>;
  contactChannel: string;
  setContactChannel: Dispatch<SetStateAction<string>>;
  email: string;
  setEmail: Dispatch<SetStateAction<string>>;
  whatsapp: string;
  setWhatsapp: Dispatch<SetStateAction<string>>;

  // Creation results
  link: string | null;
  err: string | null;
  loading: boolean;

  consultantNamePlaceholder: string;
  // Optional hook for callers that need extra UI copy injection.
  footer?: ReactNode;
};

export function PreBriefModal({
  isOpen,
  onClose,
  onCreate,
  company,
  setCompany,
  website,
  setWebsite,
  industryField,
  setIndustryField,
  industrySpecify,
  setIndustrySpecify,
  message,
  setMessage,
  consultantName,
  setConsultantName,
  expectedContact,
  setExpectedContact,
  contactChannel,
  setContactChannel,
  email,
  setEmail,
  whatsapp,
  setWhatsapp,
  link,
  err,
  loading,
  consultantNamePlaceholder,
  footer,
}: PreBriefModalProps) {
  if (!isOpen) return null;
  const baseFieldClassName =
    'w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)]';

  function onIndustryChange(e: ChangeEvent<HTMLSelectElement>) {
    const v = e.target.value;
    setIndustryField(v);
    if (v !== 'Other') setIndustrySpecify('');
  }

  function onEscape(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
      onClick={onClose}
      onKeyDown={onEscape}
      role="presentation"
      tabIndex={-1}
    >
      <div
        className="glc-card max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-[var(--radius-xl)] p-4 mobile:p-5 sm:p-6"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="prebrief-title"
      >
        <div className="flex items-start justify-between gap-2 mb-4">
          <h3 id="prebrief-title" className="text-base font-bold text-[var(--text-primary)]">
            {WORKSPACE_PAGE_COPY.newAudit.preBriefModal.title}
          </h3>
          <button
            type="button"
            aria-label={WORKSPACE_PAGE_COPY.newAudit.preBriefModal.closeAriaLabel}
            onClick={onClose}
            className="cursor-pointer border-none bg-none text-[var(--text-tertiary)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="mb-4 text-sm text-[var(--text-secondary)]">
          {WORKSPACE_PAGE_COPY.newAudit.preBriefModal.description}
        </p>

        <div className="space-y-3 mb-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-quaternary)]">
            {WORKSPACE_PAGE_COPY.newAudit.preBriefModal.preFillOnClientFormLabel}
          </p>

          <FormField label={WORKSPACE_PAGE_COPY.newAudit.preBriefModal.companyNameLabel}>
            <input
              value={company}
              onChange={e => setCompany(e.target.value)}
              placeholder={WORKSPACE_PAGE_COPY.newAudit.preBriefModal.companyNamePlaceholder}
              className={baseFieldClassName}
            />
          </FormField>

          <FormField label={WORKSPACE_PAGE_COPY.newAudit.preBriefModal.companyWebsiteLabel}>
            <input
              value={website}
              onChange={e => setWebsite(e.target.value)}
              placeholder={WORKSPACE_PAGE_COPY.newAudit.preBriefModal.companyWebsitePlaceholder}
              className={baseFieldClassName}
            />
          </FormField>

          <FormField label={WORKSPACE_PAGE_COPY.newAudit.preBriefModal.industryLabel}>
            <select
              value={industryField}
              onChange={onIndustryChange}
              className={`${baseFieldClassName} ${industryField ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'}`}
            >
              <option value="">{WORKSPACE_PAGE_COPY.newAudit.preBriefModal.industrySelectPlaceholder}</option>
              {INDUSTRY_OPTIONS.map(i => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
          </FormField>

          {industryField === 'Other' && (
            <FormField
              label={WORKSPACE_PAGE_COPY.newAudit.preBriefModal.industryOtherLabel}
              requiredMark
            >
              <input
                value={industrySpecify}
                onChange={e => setIndustrySpecify(e.target.value)}
                placeholder={WORKSPACE_PAGE_COPY.newAudit.preBriefModal.industryOtherPlaceholder}
                className={baseFieldClassName}
              />
            </FormField>
          )}

          <FormField label={WORKSPACE_PAGE_COPY.newAudit.preBriefModal.messageOptionalLabel}>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={2}
              className={`${baseFieldClassName} resize-none`}
            />
          </FormField>

          <FormField label={WORKSPACE_PAGE_COPY.newAudit.preBriefModal.consultantNameLabel}>
            <input
              value={consultantName}
              onChange={e => setConsultantName(e.target.value)}
              placeholder={consultantNamePlaceholder}
              className={baseFieldClassName}
            />
          </FormField>

          <FormField label={WORKSPACE_PAGE_COPY.newAudit.preBriefModal.expectedContactLabel}>
            <input
              value={expectedContact}
              onChange={e => setExpectedContact(e.target.value)}
              placeholder={WORKSPACE_PAGE_COPY.newAudit.preBriefModal.expectedContactPlaceholder}
              className={baseFieldClassName}
            />
          </FormField>

          <FormField label={WORKSPACE_PAGE_COPY.newAudit.preBriefModal.contactChannelLabel}>
            <input
              value={contactChannel}
              onChange={e => setContactChannel(e.target.value)}
              placeholder={WORKSPACE_PAGE_COPY.newAudit.preBriefModal.contactChannelPlaceholder}
              className={baseFieldClassName}
            />
          </FormField>

          <FormField label={WORKSPACE_PAGE_COPY.newAudit.preBriefModal.emailOptionalLabel}>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={WORKSPACE_PAGE_COPY.newAudit.preBriefModal.emailPlaceholder}
              className={baseFieldClassName}
            />
          </FormField>

          <FormField label={WORKSPACE_PAGE_COPY.newAudit.preBriefModal.whatsappOptionalLabel}>
            <input
              value={whatsapp}
              onChange={e => setWhatsapp(e.target.value)}
              placeholder={WORKSPACE_PAGE_COPY.newAudit.preBriefModal.whatsappPlaceholder}
              className={baseFieldClassName}
            />
          </FormField>
        </div>

        {err && (
          <Callout intent="danger" className="mb-2">
            <p className="text-sm text-[var(--score-1)]">{err}</p>
          </Callout>
        )}

        {link ? (
          <div className="space-y-2">
            <p className="text-xs text-[var(--text-tertiary)]">{WORKSPACE_PAGE_COPY.newAudit.preBriefModal.shareLinkLabel}</p>
            <div className="flex gap-2">
              <input
                readOnly
                value={link}
                className="flex-1 rounded border border-[var(--border-subtle)] bg-[var(--bg-inset)] px-2 py-1.5 text-xs text-[var(--text-primary)]"
              />
              <button
                type="button"
                className="cursor-pointer rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1.5 text-xs"
                onClick={() => {
                  void navigator.clipboard.writeText(link);
                }}
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <button
              type="button"
              className="mt-2 cursor-pointer border-none bg-none text-sm text-[var(--glc-blue)]"
              onClick={onClose}
            >
              {WORKSPACE_PAGE_COPY.newAudit.preBriefModal.doneText}
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={loading}
            className={cn(
              'w-full rounded-lg border-none bg-[var(--gradient-brand)] py-2.5 text-sm font-semibold text-[var(--primary-foreground)]',
              loading ? 'cursor-wait' : 'cursor-pointer',
            )}
            onClick={() => {
              void onCreate();
            }}
          >
            {loading ? WORKSPACE_PAGE_COPY.newAudit.preBriefModal.creatingLinkText : WORKSPACE_PAGE_COPY.newAudit.preBriefModal.createLinkText}
          </button>
        )}

        {footer}
      </div>
    </div>
  );
}

