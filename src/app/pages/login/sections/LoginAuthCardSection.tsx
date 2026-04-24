import type { FormEvent } from 'react';
import { motion } from 'motion/react';
import type { User } from '@supabase/supabase-js';
import { LOGIN_PAGE_COPY_EN as LC } from '../../../config/login-copy.en';
import { isAnonymousUser } from '../../../hooks/useAuth';
import { useAuthTabsA11y } from '../hooks/useAuthTabsA11y';
import type { AuthMode, FieldErrors, SignupLegalFieldState } from '../types';
import { AuthTabs } from '../components/AuthTabs';
import { AuthErrorBanner } from '../components/AuthErrorBanner';
import { RecoveryForm } from '../components/forms/RecoveryForm';
import { ForgotPasswordForm } from '../components/forms/ForgotPasswordForm';
import { SignInUpForm } from '../components/forms/SignInUpForm';

type LoginAuthCardSectionProps = {
  mode: AuthMode;
  activateMode: (mode: AuthMode) => void;
  passwordRecoveryMode: boolean;
  user: User | null;
  email: string;
  password: string;
  recoveryPassword: string;
  recoveryConfirm: string;
  showPassword: boolean;
  loading: boolean;
  forgotSent: boolean;
  isReady: boolean;
  submitLabel: string;
  fieldErrors: FieldErrors;
  globalError: string | null;
  authError: string | null;
  setEmail: (value: string) => void;
  setPassword: (value: string) => void;
  setRecoveryPassword: (value: string) => void;
  setRecoveryConfirm: (value: string) => void;
  setShowPassword: (value: boolean | ((prev: boolean) => boolean)) => void;
  setFieldErrors: (updater: (prev: FieldErrors) => FieldErrors) => void;
  handleSubmit: (event: FormEvent) => Promise<void>;
  handleForgotSubmit: (event: FormEvent) => Promise<void>;
  handleRecoverySubmit: (event: FormEvent) => Promise<void>;
  handleGoogle: () => Promise<void>;
  authTabIds: { signIn: string; signUp: string; panel: string };
  errorIds: { email: string; password: string; recoveryPassword: string; recoveryConfirm: string };
  minPasswordLength: number;
  motionPolicy: {
    buttonHoverScale: number;
    buttonTapScale: number;
  };
  signupLegal: SignupLegalFieldState;
  onSignupLegalChange: (patch: Partial<SignupLegalFieldState>) => void;
};

export function LoginAuthCardSection(props: LoginAuthCardSectionProps) {
  const {
    mode,
    activateMode,
    passwordRecoveryMode,
    user,
    email,
    password,
    recoveryPassword,
    recoveryConfirm,
    showPassword,
    loading,
    forgotSent,
    isReady,
    submitLabel,
    fieldErrors,
    globalError,
    authError,
    setEmail,
    setPassword,
    setRecoveryPassword,
    setRecoveryConfirm,
    setShowPassword,
    setFieldErrors,
    handleSubmit,
    handleForgotSubmit,
    handleRecoverySubmit,
    handleGoogle,
    authTabIds,
    errorIds,
    minPasswordLength,
    motionPolicy,
    signupLegal,
    onSignupLegalChange,
  } = props;

  const { signInTabRef, signUpTabRef, handleAuthTabsKeyDown } = useAuthTabsA11y({ mode, activateMode });

  return (
    <div
      className="glc-card glc-auth-card space-y-5 rounded-[var(--radius-2xl)] p-6 shadow-[var(--shadow-lg)]"
    >
      {!passwordRecoveryMode && mode !== 'forgot' && (
        <AuthTabs
          mode={mode}
          authTabIds={authTabIds}
          signInTabRef={signInTabRef}
          signUpTabRef={signUpTabRef}
          onActivateMode={activateMode}
          onKeyDown={handleAuthTabsKeyDown}
        />
      )}

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {passwordRecoveryMode && user && !isAnonymousUser(user) && (
          <RecoveryForm
            userEmail={user.email}
            recoveryPassword={recoveryPassword}
            recoveryConfirm={recoveryConfirm}
            showPassword={showPassword}
            loading={loading}
            minPasswordLength={minPasswordLength}
            fieldErrors={fieldErrors}
            recoveryPasswordErrorId={errorIds.recoveryPassword}
            recoveryConfirmErrorId={errorIds.recoveryConfirm}
            buttonHoverScale={motionPolicy.buttonHoverScale}
            buttonTapScale={motionPolicy.buttonTapScale}
            onSubmit={handleRecoverySubmit}
            onRecoveryPasswordChange={value => {
              setRecoveryPassword(value);
              setFieldErrors(prev => ({ ...prev, recoveryPassword: null }));
            }}
            onRecoveryConfirmChange={value => {
              setRecoveryConfirm(value);
              setFieldErrors(prev => ({ ...prev, recoveryConfirm: null }));
            }}
            onTogglePassword={() => setShowPassword(prev => !prev)}
          />
        )}

        {!passwordRecoveryMode && mode === 'forgot' && (
          <ForgotPasswordForm
            email={email}
            forgotSent={forgotSent}
            loading={loading}
            emailError={fieldErrors.email}
            emailErrorId={errorIds.email}
            buttonHoverScale={motionPolicy.buttonHoverScale}
            onBack={() => activateMode('signin')}
            onSubmit={handleForgotSubmit}
            onEmailChange={value => {
              setEmail(value);
              setFieldErrors(prev => ({ ...prev, email: null }));
            }}
          />
        )}

        {!passwordRecoveryMode && mode !== 'forgot' && isAnonymousUser(user) && (
          <div className="mb-4 rounded-[var(--radius-xl)] border px-4 py-3 ds-login-anonymous-hint">
            <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
              {LC.anonymousHint}
            </p>
          </div>
        )}

        {!passwordRecoveryMode && mode !== 'forgot' && (
          <SignInUpForm
            mode={mode}
            authTabIds={authTabIds}
            email={email}
            password={password}
            showPassword={showPassword}
            loading={loading}
            isReady={isReady}
            minPasswordLength={minPasswordLength}
            submitLabel={submitLabel}
            fieldErrors={fieldErrors}
            emailErrorId={errorIds.email}
            passwordErrorId={errorIds.password}
            buttonHoverScale={motionPolicy.buttonHoverScale}
            buttonTapScale={motionPolicy.buttonTapScale}
            onSubmit={handleSubmit}
            onGoogleClick={handleGoogle}
            onForgotClick={() => activateMode('forgot')}
            onEmailChange={value => {
              setEmail(value);
              setFieldErrors(prev => ({ ...prev, email: null }));
            }}
            onPasswordChange={value => {
              setPassword(value);
              setFieldErrors(prev => ({ ...prev, password: null }));
            }}
            onTogglePassword={() => setShowPassword(prev => !prev)}
            signupLegal={signupLegal}
            onSignupLegalChange={onSignupLegalChange}
          />
        )}
      </motion.div>

      <AuthErrorBanner message={globalError ?? authError} />

    </div>
  );
}
