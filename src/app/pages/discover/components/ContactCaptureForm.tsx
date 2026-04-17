import { CheckCircle, PaperPlaneRight, Spinner } from '@phosphor-icons/react';
import discoverResultsUi from '../../../data/discover-page-results-ui.en.json';
import { hasAnyContactValue } from '../services';
import { cn } from '../../../components/ui/utils';

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
      <div className="bg-success/10 border-success/40 flex items-center gap-3 rounded-2xl border p-5">
        <CheckCircle size={22} weight="fill" className="text-success flex-shrink-0" />
        <div>
          <p className="text-success text-base font-semibold">
            {discoverResultsUi.copy.contactSavedTitle}
          </p>
          <p className="text-muted-foreground text-[length:var(--text-base)] leading-[1.55]">
            {discoverResultsUi.copy.contactSavedBody}
          </p>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="bg-card min-w-0 max-w-full space-y-4 rounded-2xl border p-5 sm:p-6"
    >
      <div>
        <p className="text-foreground mb-1.5 text-base font-semibold">
          {discoverResultsUi.copy.contactFormTitle}
        </p>
        <p className="text-muted-foreground text-[length:var(--text-base)] leading-[1.6]">
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
            className="glc-field-control text-foreground w-full rounded-xl border bg-[var(--input-background)] px-4 py-3 text-[length:var(--text-base)] outline-none"
          />
        ))}
      </div>
      {contactError && <p className="text-destructive text-sm">{contactError}</p>}
      <button
        type="submit"
        disabled={contactSaving || !hasAnyValue}
        className={cn(
          'w-full rounded-xl py-3 text-[length:var(--text-base)] font-semibold',
          contactSaving || !hasAnyValue
            ? 'bg-muted text-muted-foreground cursor-not-allowed border'
            : 'bg-gradient-to-r from-sky-400 to-sky-600 text-primary-foreground border-info/40 border',
        )}
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
