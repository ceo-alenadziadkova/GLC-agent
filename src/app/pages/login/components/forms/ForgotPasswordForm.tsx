import type { FormEvent } from 'react';
import { motion } from 'motion/react';
import { LOGIN_PAGE_COPY_EN as LC } from '../../../../config/login-copy.en';
import { LOGIN_FORM_STYLE_PRESETS } from '../../config/login-ui-policy';
import type { FieldErrors } from '../../types';
import { Callout } from '../../../../components/ui/callout';
import { FormField } from '../../../../components/ui/form-field';

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
  const submitStyle = canSubmit
    ? LOGIN_FORM_STYLE_PRESETS.submitButtonReady
    : LOGIN_FORM_STYLE_PRESETS.submitButtonDisabled;
  return (
    <div className="space-y-4">
      <button
        type="button"
        className="glc-touch-target border-none bg-transparent text-xs font-medium text-[var(--glc-blue)]"
        onClick={onBack}
      >
        {LC.forgotBack}
      </button>
      <h2 className="text-sm font-semibold text-[var(--text-primary)]">{LC.forgotHeading}</h2>
      <p className="text-xs leading-relaxed text-[var(--text-secondary)]">{LC.forgotBlurb}</p>
      {forgotSent ? (
        <Callout intent="info">
          <p role="status" aria-live="polite" className="text-sm">
            {LC.forgotSentPrefix}<span className="font-mono glc-auth-inline-mono">{email.trim()}</span>{LC.forgotSentSuffix}
          </p>
        </Callout>
      ) : (
        <form onSubmit={onSubmit} className="space-y-3">
          <FormField
            htmlFor="forgot-email"
            label={<span className="sr-only">{LC.labelEmail}</span>}
            error={emailError ? <span id={emailErrorId}>{emailError}</span> : undefined}
          >
            <input
              id="forgot-email"
              type="email"
              value={email}
              onChange={event => onEmailChange(event.target.value)}
              placeholder={LC.placeholderEmail}
              required
              autoComplete="email"
              aria-invalid={Boolean(emailError)}
              aria-describedby={emailError ? emailErrorId : undefined}
              className="glc-auth-input w-full px-4 py-3 bg-transparent outline-none"
              style={LOGIN_FORM_STYLE_PRESETS.inputBase}
            />
          </FormField>
          <motion.button
            type="submit"
            disabled={loading || !canSubmit}
            whileHover={!loading && canSubmit ? { scale: buttonHoverScale } : {}}
            className="w-full flex items-center justify-center gap-2 py-3 font-semibold"
            style={{
              ...LOGIN_FORM_STYLE_PRESETS.submitButtonBase,
              ...submitStyle,
              cursor: canSubmit && !loading ? 'pointer' : 'not-allowed',
            }}
          >
            {loading ? LC.forgotSending : LC.forgotSendLink}
          </motion.button>
        </form>
      )}
    </div>
  );
}
