import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router';
import {
  LOGIN_GOOGLE_MANUAL_LINKING_HINT_EN,
  LOGIN_PAGE_COPY_EN as LC,
} from '../../../config/login-copy.en';
import { LOGIN_UI_POLICY } from '../config/login-ui-policy';
import { validateAuthCredentials, validateForgotPasswordEmail, validateRecoveryPasswords } from '../domain/login-validation';
import { useAuth, isAnonymousUser } from '../../../hooks/useAuth';
import { logger } from '../../../lib/logger';
import { mapUnknownLoginError } from '../mappers/login-error.mapper';
import { GLC_DISCOVERY_SESSION_TOKEN_STORAGE_KEY } from '../../../lib/storage-keys';
import { EMPTY_FIELD_ERRORS, type AuthMode, type FieldErrors } from '../types';
import { resolveLoginRedirect } from '../services/login-session-reconcile-service';
import { createLoginAuthService } from '../services/login-auth-service';

export function useLoginController() {
  const navigate = useNavigate();
  const {
    signInWithPassword,
    signUpWithPassword,
    signInWithGoogle,
    requestPasswordReset,
    completePasswordRecovery,
    isAuthenticated,
    authError,
    user,
    passwordRecoveryMode,
  } = useAuth();

  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [recoveryPassword, setRecoveryPassword] = useState('');
  const [recoveryConfirm, setRecoveryConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>(EMPTY_FIELD_ERRORS);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [forgotSent, setForgotSent] = useState(false);
  const [isDesktopTwoColumn, setIsDesktopTwoColumn] = useState(false);
  const authService = createLoginAuthService({
    signInWithPassword,
    signUpWithPassword,
    signInWithGoogle,
    requestPasswordReset,
    completePasswordRecovery,
  });

  function clearErrors() {
    setGlobalError(null);
    setFieldErrors(EMPTY_FIELD_ERRORS);
  }

  function activateMode(nextMode: AuthMode) {
    setMode(nextMode);
    clearErrors();
    setForgotSent(false);
  }

  useEffect(() => {
    const discovery = new URLSearchParams(window.location.search).get('discovery');
    if (discovery) {
      localStorage.setItem(GLC_DISCOVERY_SESSION_TOKEN_STORAGE_KEY, discovery);
    }
  }, []);

  useEffect(() => {
    const desktopMedia = window.matchMedia(`(min-width: ${LOGIN_UI_POLICY.desktopTwoColumnMinWidthPx}px)`);
    const applyMediaState = () => setIsDesktopTwoColumn(desktopMedia.matches);
    applyMediaState();
    desktopMedia.addEventListener('change', applyMediaState);
    return () => {
      desktopMedia.removeEventListener('change', applyMediaState);
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      return;
    }
    if (passwordRecoveryMode) {
      logger.info('Login: password recovery session, stay on /login until new password is set');
      return;
    }
    if (isAnonymousUser(user)) {
      logger.info('Login: anonymous session detected, stay on /login for account upgrade');
      return;
    }

    let cancelled = false;
    void (async () => {
      const nextPath = await resolveLoginRedirect(window.location.search);
      if (cancelled) {
        return;
      }
      navigate(nextPath, { replace: true });
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, navigate, passwordRecoveryMode, user]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (loading) return;
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) return;

    const validationError = validateAuthCredentials(trimmedEmail, password, mode === 'signup');
    if (validationError.email || validationError.password) {
      setFieldErrors(prev => ({ ...prev, ...validationError }));
      return;
    }

    setLoading(true);
    clearErrors();

    try {
      if (mode === 'signin') {
        const { error } = await authService.signIn(trimmedEmail, password);
        logger.info('Login: signInWithPassword result', { hasError: !!error, errorMessage: error?.message });
        if (error) {
          setGlobalError(error.message);
        }
        return;
      }
      const { error } = await authService.signUp(trimmedEmail, password);
      logger.info('Login: signUpWithPassword result', { hasError: !!error, errorMessage: error?.message });
      if (error) {
        setGlobalError(error.message);
      }
    } catch (error) {
      setGlobalError(mapUnknownLoginError(error, 'Authentication failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotSubmit(event: FormEvent) {
    event.preventDefault();
    if (loading) return;

    const validationError = validateForgotPasswordEmail(email);
    if (validationError.email) {
      setFieldErrors(prev => ({ ...prev, ...validationError }));
      return;
    }

    setLoading(true);
    clearErrors();
    setForgotSent(false);
    try {
      const { error } = await authService.requestReset(email.trim());
      if (error) {
        setGlobalError(error.message);
        return;
      }
      setForgotSent(true);
    } catch (error) {
      setGlobalError(mapUnknownLoginError(error, 'Unable to send reset link. Please try again.'));
    } finally {
      setLoading(false);
    }
  }

  async function handleRecoverySubmit(event: FormEvent) {
    event.preventDefault();
    if (loading) return;

    const validationError = validateRecoveryPasswords(recoveryPassword, recoveryConfirm);
    if (validationError.recoveryPassword || validationError.recoveryConfirm) {
      setFieldErrors(prev => ({ ...prev, ...validationError }));
      return;
    }

    setLoading(true);
    clearErrors();
    try {
      const { error } = await authService.completeRecovery(recoveryPassword);
      if (error) {
        setGlobalError(error.message);
        return;
      }
      setRecoveryPassword('');
      setRecoveryConfirm('');
    } catch (error) {
      setGlobalError(mapUnknownLoginError(error, 'Unable to update password. Please try again.'));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    if (loading) return;
    setLoading(true);
    clearErrors();
    try {
      const { error } = await authService.signInWithGoogle();
      if (!error) return;
      const message = (error.message ?? '').toLowerCase();
      if (message.includes('manual linking')) {
        setGlobalError(LOGIN_GOOGLE_MANUAL_LINKING_HINT_EN);
        return;
      }
      setGlobalError(error.message);
    } catch (error) {
      setGlobalError(mapUnknownLoginError(error, 'Google sign-in failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  }

  const isReady = email.trim().length > 0 && password.length > 0;
  const submitLabel = mode === 'signin' ? LC.submitSignIn : LC.submitCreateAccount;
  const loginTagline = passwordRecoveryMode
    ? LC.taglineRecovery
    : mode === 'signup'
      ? LC.taglineSignUp
      : mode === 'forgot'
        ? LC.taglineForgot
        : LC.taglineSignIn;

  const formClosedClipPath = isDesktopTwoColumn
    ? LOGIN_UI_POLICY.formClipPath.desktopClosed
    : LOGIN_UI_POLICY.formClipPath.mobileClosed;
  const formOpenClipPath = isDesktopTwoColumn
    ? LOGIN_UI_POLICY.formClipPath.desktopOpen
    : LOGIN_UI_POLICY.formClipPath.mobileOpen;

  return {
    mode,
    activateMode,
    email,
    setEmail,
    password,
    setPassword,
    recoveryPassword,
    setRecoveryPassword,
    recoveryConfirm,
    setRecoveryConfirm,
    showPassword,
    setShowPassword,
    loading,
    fieldErrors,
    setFieldErrors,
    globalError,
    forgotSent,
    user,
    authError,
    isReady,
    submitLabel,
    loginTagline,
    passwordRecoveryMode,
    handleSubmit,
    handleForgotSubmit,
    handleRecoverySubmit,
    handleGoogle,
    formClosedClipPath,
    formOpenClipPath,
    motionPolicy: LOGIN_UI_POLICY.motion,
    authTabIds: LOGIN_UI_POLICY.authTabIds,
    errorIds: LOGIN_UI_POLICY.errorIds,
    minPasswordLength: LOGIN_UI_POLICY.minPasswordLength,
  };
}
