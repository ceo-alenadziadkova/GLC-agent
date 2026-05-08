import type { FormEvent } from 'react';
import { motion } from 'motion/react';
import { LOGIN_PAGE_COPY_EN as LC } from '../../../../config/login-copy.en';
import type { FieldErrors } from '../../types';
import { cn } from '../../../../components/ui/utils';
import { Callout } from '../../../../components/ui/callout';
import { FormField } from '../../../../components/ui/form-field';
import { Input } from '../../../../../design-system/ui';

type ForgotPasswordFormProps = {
  email: string;
  forgotSent: boolean;
  loading: boolean;
  emailError: FieldErrors['email'];
  emailErrorId: string;
  buttonHoverScale: number;
  onBack: () => void;
  onSubmit: (event: FormEvent) => Promise<void>;
  onEmailChange: (value: string) => void;
};

export function ForgotPasswordForm(props: ForgotPasswordFormProps) {
  const { email, forgotSent, loading, emailError, emailErrorId, buttonHoverScale, onBack, onSubmit, onEmailChange } = props;
  const canSubmit = Boolean(email.trim());
  return (
    <div className="space-y-4">
      <button
        type="button"
        className="ds-touch-target border-none bg-transparent text-xs font-medium text-[var(--text-blue)]"
        onClick={onBack}
      >
        {LC.forgotBack}
      </button>
      <h2 className="text-sm font-semibold text-[var(--text-primary)]">{LC.forgotHeading}</h2>
      <p className="text-xs leading-relaxed text-[var(--text-secondary)]">{LC.forgotBlurb}</p>
      {forgotSent ? (
        <Callout intent="info">
          <p role="status" aria-live="polite" className="text-sm">
            {LC.forgotSentPrefix}<span className="font-mono ds-auth-inline-mono">{email.trim()}</span>{LC.forgotSentSuffix}
          </p>
        </Callout>
      ) : (
        <form onSubmit={onSubmit} className="space-y-3">
          <FormField
            htmlFor="forgot-email"
            label={<span className="sr-only">{LC.labelEmail}</span>}
            error={emailError ? <span id={emailErrorId}>{emailError}</span> : undefined}
          >
            <Input
              id="forgot-email"
              type="email"
              value={email}
              onChange={event => onEmailChange(event.target.value)}
              placeholder={LC.placeholderEmail}
              required
              autoComplete="email"
              aria-invalid={Boolean(emailError)}
              aria-describedby={emailError ? emailErrorId : undefined}
              className="ds-auth-input ds-auth-input--field h-auto w-full min-h-10 px-4 py-3 outline-none"
            />
          </FormField>
          <motion.button
            type="submit"
            disabled={loading || !canSubmit}
            whileHover={!loading && canSubmit ? { scale: buttonHoverScale } : {}}
            className={cn(
              'ds-auth-primary-btn ds-auth-submit-btn flex w-full items-center justify-center gap-2 py-3 font-semibold',
              canSubmit ? 'ds-auth-submit-btn--ready' : 'ds-auth-submit-btn--disabled',
              canSubmit && !loading ? 'cursor-pointer' : 'cursor-not-allowed',
            )}
          >
            {loading ? LC.forgotSending : LC.forgotSendLink}
          </motion.button>
        </form>
      )}
    </div>
  );
}
