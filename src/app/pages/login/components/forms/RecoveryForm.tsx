import type { FormEvent } from 'react';
import { motion } from 'motion/react';
import { Eye, EyeSlash, Lock } from '@phosphor-icons/react';
import { LOGIN_PAGE_COPY_EN as LC } from '../../../../config/login-copy.en';
import type { FieldErrors } from '../../types';
import { FormField } from '../../../../components/ui/form-field';
import { cn } from '../../../../components/ui/utils';

type RecoveryFormProps = {
  userEmail: string | null | undefined;
  recoveryPassword: string;
  recoveryConfirm: string;
  showPassword: boolean;
  loading: boolean;
  minPasswordLength: number;
  fieldErrors: FieldErrors;
  recoveryPasswordErrorId: string;
  recoveryConfirmErrorId: string;
  buttonHoverScale: number;
  buttonTapScale: number;
  onSubmit: (event: FormEvent) => Promise<void>;
  onRecoveryPasswordChange: (value: string) => void;
  onRecoveryConfirmChange: (value: string) => void;
  onTogglePassword: () => void;
};

export function RecoveryForm(props: RecoveryFormProps) {
  const {
    userEmail,
    recoveryPassword,
    recoveryConfirm,
    showPassword,
    loading,
    minPasswordLength,
    fieldErrors,
    recoveryPasswordErrorId,
    recoveryConfirmErrorId,
    buttonHoverScale,
    buttonTapScale,
    onSubmit,
    onRecoveryPasswordChange,
    onRecoveryConfirmChange,
    onTogglePassword,
  } = props;

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-[var(--text-primary)]">{LC.recoveryHeading}</h2>
      <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
        {LC.recoveryIntroBeforeEmail}<span className="font-mono glc-auth-inline-mono">{userEmail}</span>
        {LC.recoveryIntroAfterEmail}
      </p>
      <form onSubmit={onSubmit} className="space-y-3">
        <FormField
          htmlFor="recovery-password"
          label={<span className="sr-only">{LC.labelNewPassword}</span>}
          error={fieldErrors.recoveryPassword ? <span id={recoveryPasswordErrorId}>{fieldErrors.recoveryPassword}</span> : undefined}
        >
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
            <input
              id="recovery-password"
              type={showPassword ? 'text' : 'password'}
              value={recoveryPassword}
              onChange={event => onRecoveryPasswordChange(event.target.value)}
              placeholder={LC.placeholderNewPassword}
              required
              minLength={minPasswordLength}
              autoComplete="new-password"
              aria-invalid={Boolean(fieldErrors.recoveryPassword)}
              aria-describedby={fieldErrors.recoveryPassword ? recoveryPasswordErrorId : undefined}
              className="glc-auth-input glc-auth-input--field w-full py-3 pl-9 pr-11 outline-none"
            />
            <button
              type="button"
              onClick={onTogglePassword}
              aria-label={showPassword ? LC.ariaHidePassword : LC.ariaShowPassword}
              className="glc-touch-target absolute right-3 top-1/2 inline-flex -translate-y-1/2 items-center justify-center border-none bg-transparent text-[var(--text-tertiary)]"
            >
              {showPassword ? <EyeSlash className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </FormField>
        <FormField
          htmlFor="recovery-confirm"
          label={<span className="sr-only">{LC.labelConfirmNewPassword}</span>}
          error={fieldErrors.recoveryConfirm ? <span id={recoveryConfirmErrorId}>{fieldErrors.recoveryConfirm}</span> : undefined}
        >
          <input
            id="recovery-confirm"
            type="password"
            value={recoveryConfirm}
            onChange={event => onRecoveryConfirmChange(event.target.value)}
            placeholder={LC.placeholderConfirmNewPassword}
            required
            minLength={minPasswordLength}
            autoComplete="new-password"
            aria-invalid={Boolean(fieldErrors.recoveryConfirm)}
            aria-describedby={fieldErrors.recoveryConfirm ? recoveryConfirmErrorId : undefined}
            className="glc-auth-input glc-auth-input--field w-full px-4 py-3 outline-none"
          />
        </FormField>
        <motion.button
          type="submit"
          disabled={loading}
          whileHover={!loading ? { scale: buttonHoverScale } : {}}
          whileTap={!loading ? { scale: buttonTapScale } : {}}
          className={cn(
            'glc-auth-primary-btn glc-auth-submit-btn glc-auth-submit-btn--ready flex w-full items-center justify-center gap-2 py-3 font-semibold',
            loading ? 'cursor-not-allowed disabled:opacity-70' : 'cursor-pointer',
          )}
        >
          {loading ? LC.recoverySubmitSaving : LC.recoverySubmit}
        </motion.button>
      </form>
    </div>
  );
}
