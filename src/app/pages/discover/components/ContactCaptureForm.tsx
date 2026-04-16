import { CheckCircle, PaperPlaneRight, Spinner } from '@phosphor-icons/react';
import { GLC_BRAND_HEX } from '@glc/brand-tokens';
import { UI_SEMANTIC_COLORS } from '../../../config/ui-semantic-colors';
import discoverResultsUi from '../../../data/discover-page-results-ui.en.json';
import { hasAnyContactValue } from '../services';

type ContactCaptureFormProps = {
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  contactCompany: string;
  onContactNameChange: (value: string) => void;
  onContactEmailChange: (value: string) => void;
  onContactPhoneChange: (value: string) => void;
  onContactCompanyChange: (value: string) => void;
  contactSaving: boolean;
  contactSaved: boolean;
  contactError: string | null;
  onSubmit: (event: React.FormEvent) => void;
};

export function ContactCaptureForm(props: ContactCaptureFormProps) {
  const {
    contactName,
    contactEmail,
    contactPhone,
    contactCompany,
    onContactNameChange,
    onContactEmailChange,
    onContactPhoneChange,
    onContactCompanyChange,
    contactSaving,
    contactSaved,
    contactError,
    onSubmit,
  } = props;
  const hasAnyValue = hasAnyContactValue({
    contactName,
    contactEmail,
    contactPhone,
    contactCompany,
  });

  if (contactSaved) {
    return (
      <div
        className="flex items-center gap-3 rounded-2xl p-5"
        style={{ background: 'var(--glc-green-muted)', border: '1px solid rgba(14,207,130,0.28)' }}
      >
        <CheckCircle size={22} weight="fill" className="flex-shrink-0" style={{ color: 'var(--glc-green-dark)' }} />
        <div>
          <p className="font-semibold" style={{ fontSize: '1rem', color: UI_SEMANTIC_COLORS.success }}>
            {discoverResultsUi.copy.contactSavedTitle}
          </p>
          <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
            {discoverResultsUi.copy.contactSavedBody}
          </p>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="min-w-0 max-w-full space-y-4 rounded-2xl p-5 sm:p-6"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', boxSizing: 'border-box' }}
    >
      <div>
        <p className="font-semibold mb-1.5" style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>
          {discoverResultsUi.copy.contactFormTitle}
        </p>
        <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          {discoverResultsUi.copy.contactFormHint}
        </p>
      </div>
      <div className="space-y-2.5">
        {[
          { placeholder: discoverResultsUi.copy.contactPlaceholders.name, value: contactName, setter: onContactNameChange, type: 'text' },
          { placeholder: discoverResultsUi.copy.contactPlaceholders.email, value: contactEmail, setter: onContactEmailChange, type: 'email' },
          { placeholder: discoverResultsUi.copy.contactPlaceholders.phone, value: contactPhone, setter: onContactPhoneChange, type: 'tel' },
          { placeholder: discoverResultsUi.copy.contactPlaceholders.company, value: contactCompany, setter: onContactCompanyChange, type: 'text' },
        ].map(({ placeholder, value, setter, type }) => (
          <input
            key={placeholder}
            type={type}
            placeholder={placeholder}
            value={value}
            onChange={event => setter(event.target.value)}
            className="glc-field-control w-full px-4 py-3 rounded-xl outline-none"
            style={{
              fontSize: '0.9375rem',
              background: 'var(--input-background)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-primary)',
            }}
          />
        ))}
      </div>
      {contactError && <p style={{ fontSize: '0.875rem', color: 'var(--score-1)' }}>{contactError}</p>}
      <button
        type="submit"
        disabled={contactSaving || !hasAnyValue}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold"
        style={{
          fontSize: '0.9375rem',
          background:
            contactSaving || !hasAnyValue
              ? 'color-mix(in oklab, var(--bg-muted) 90%, var(--bg-surface))'
              : `linear-gradient(135deg, ${GLC_BRAND_HEX.blue}, ${GLC_BRAND_HEX.blueDeep})`,
          color:
            contactSaving || !hasAnyValue
              ? 'var(--text-tertiary)'
              : 'var(--primary-foreground)',
          border: '1px solid color-mix(in oklab, var(--glc-blue) 32%, var(--border-default))',
          cursor: contactSaving || !hasAnyValue ? 'not-allowed' : 'pointer',
        }}
      >
        <span key={contactSaving ? 'saving' : 'idle'} className="inline-flex items-center justify-center gap-2">
          {contactSaving ? (
            <>
              <Spinner size={14} className="animate-spin" aria-hidden />
              {discoverResultsUi.copy.contactSaving}
            </>
          ) : (
            <>
              <PaperPlaneRight size={14} aria-hidden />
              {discoverResultsUi.copy.contactSave}
            </>
          )}
        </span>
      </button>
    </form>
  );
}
