import type { FormEvent } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Eye, EyeSlash, Lock } from '@phosphor-icons/react';
import { LOGIN_PAGE_COPY_EN as LC } from '../../../../config/login-copy.en';
import { LOGIN_FORM_STYLE_PRESETS } from '../../config/login-ui-policy';
import type { AuthMode, FieldErrors } from '../../types';
import { FormField } from '../../../../components/ui/form-field';

type SignInUpFormProps = {
  mode: AuthMode;
  authTabIds: { signIn: string; signUp: string; panel: string };
  email: string;
  password: string;
  showPassword: boolean;
  loading: boolean;
  isReady: boolean;
  minPasswordLength: number;
  submitLabel: string;
  fieldErrors: FieldErrors;
  emailErrorId: string;
  passwordErrorId: string;
  buttonHoverScale: number;
  buttonTapScale: number;
  onSubmit: (event: FormEvent) => Promise<void>;
  onGoogleClick: () => Promise<void>;
  onForgotClick: () => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onTogglePassword: () => void;
};

export function SignInUpForm(props: SignInUpFormProps) {
  const {
    mode,
    authTabIds,
    email,
    password,
    showPassword,
    loading,
    isReady,
    minPasswordLength,
    submitLabel,
    fieldErrors,
    emailErrorId,
    passwordErrorId,
    buttonHoverScale,
    buttonTapScale,
    onSubmit,
    onGoogleClick,
    onForgotClick,
    onEmailChange,
    onPasswordChange,
    onTogglePassword,
  } = props;
  const submitStyle = isReady
    ? LOGIN_FORM_STYLE_PRESETS.submitButtonReady
    : LOGIN_FORM_STYLE_PRESETS.submitButtonDisabled;

  return (
    <>
      <button
        onClick={onGoogleClick}
        disabled={loading}
        className="glc-auth-social-btn flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] py-3 text-sm font-medium text-[var(--text-primary)] disabled:cursor-not-allowed"
      >
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
        {LC.continueGoogle}
      </button>

      <div className="flex items-center gap-3 my-5">
        <div className="h-px flex-1 bg-[var(--border-subtle)]" />
        <span className="text-xs text-[var(--text-tertiary)]">{LC.dividerOr}</span>
        <div className="h-px flex-1 bg-[var(--border-subtle)]" />
      </div>

      <form
        id={authTabIds.panel}
        role="tabpanel"
        aria-labelledby={mode === 'signin' ? authTabIds.signIn : authTabIds.signUp}
        onSubmit={onSubmit}
        className="space-y-3"
      >
        <FormField label={<span className="sr-only">{LC.labelEmail}</span>} htmlFor="auth-email" error={fieldErrors.email ? <span id={emailErrorId}>{fieldErrors.email}</span> : undefined}>
          <input
            id="auth-email"
            type="email"
            name="email"
            value={email}
            onChange={event => onEmailChange(event.target.value)}
            placeholder={LC.placeholderEmail}
            required
            autoComplete="email"
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? emailErrorId : undefined}
            className="glc-auth-input w-full bg-transparent px-4 py-3 outline-none"
            style={LOGIN_FORM_STYLE_PRESETS.inputBase}
          />
        </FormField>
        <FormField label={<span className="sr-only">{LC.labelPassword}</span>} htmlFor="auth-password" error={fieldErrors.password ? <span id={passwordErrorId}>{fieldErrors.password}</span> : undefined}>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
            <input
              id="auth-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={event => onPasswordChange(event.target.value)}
              placeholder={LC.placeholderPassword}
              required
              minLength={mode === 'signup' ? minPasswordLength : 1}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? passwordErrorId : undefined}
              className="glc-auth-input w-full bg-transparent py-3 pl-9 pr-11 outline-none"
              style={LOGIN_FORM_STYLE_PRESETS.inputBase}
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
        {mode === 'signin' && (
          <div className="flex justify-end -mt-1">
            <button
              type="button"
              className="glc-touch-target text-xs font-medium"
              style={LOGIN_FORM_STYLE_PRESETS.secondaryLinkButton}
              onClick={onForgotClick}
            >
              {LC.forgotPasswordLink}
            </button>
          </div>
        )}
        {mode === 'signup' && (
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {LC.signupPasswordHint}
          </p>
        )}
        <motion.button
          type="submit"
          disabled={loading || !isReady}
          whileHover={!loading ? { scale: buttonHoverScale } : {}}
          whileTap={!loading ? { scale: buttonTapScale } : {}}
          className="glc-auth-primary-btn w-full flex items-center justify-center gap-2 py-3 font-semibold"
          style={{
            ...LOGIN_FORM_STYLE_PRESETS.submitButtonBase,
            ...submitStyle,
            cursor: isReady && !loading ? 'pointer' : 'not-allowed',
          }}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin border-[var(--primary-foreground)]" />
              {mode === 'signin' ? LC.signingIn : LC.creating}
            </span>
          ) : (
            <span className="flex items-center gap-2">
              {submitLabel} <ArrowRight className="w-4 h-4" />
            </span>
          )}
        </motion.button>
      </form>
    </>
  );
}
