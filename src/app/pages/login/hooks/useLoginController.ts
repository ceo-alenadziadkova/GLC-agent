import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router';
import {
  LOGIN_GOOGLE_MANUAL_LINKING_HINT_EN,
  LOGIN_PAGE_COPY_EN as LC,
} from '../../../config/login-copy.en';
import { LEGAL_SIGNUP_COPY_EN } from '../../../config/legal-signup-copy.en';
import { api } from '../../../data/apiService';
import { LOGIN_UI_POLICY } from '../config/login-ui-policy';
import { buildSignupLegalConsentEvents } from '../domain/build-signup-legal-consent-events';
import { validateAuthCredentials, validateForgotPasswordEmail, validateRecoveryPasswords } from '../domain/login-validation';
import { useAuth, isAnonymousUser } from '../../../hooks/useAuth';
import { logger } from '../../../lib/logger';
import { mapUnknownLoginError } from '../mappers/login-error.mapper';
import { GLC_DISCOVERY_SESSION_TOKEN_STORAGE_KEY } from '../../../lib/storage-keys';
import { EMPTY_FIELD_ERRORS, type AuthMode, type FieldErrors, type SignupLegalFieldState } from '../types';
import { resolveLoginRedirect } from '../services/login-session-reconcile-service';
import { createLoginAuthService } from '../services/login-auth-service';
import type { LegalConsentsResponse } from '../../../data/api/brief-profile-platform';
import { APP_ROUTE_PATHS } from '../../../config/route-paths';
const INITIAL_SIGNUP_LEGAL: SignupLegalFieldState = {
  acceptTos: false,
  acceptPrivacy: false,
};

function hasAcceptedRequiredLegalConsents(payload: LegalConsentsResponse): boolean {
  const tosAccepted = payload.effective.some(
    consent => consent.consent_key === 'tos_acceptance' && consent.accepted,
  );
  const privacyAccepted = payload.effective.some(
    consent => consent.consent_key === 'privacy_acknowledgment' && consent.accepted,
  );
  return tosAccepted && privacyAccepted;
}

export function useLoginController() {
  const navigate = useNavigate();
  const {
    signInWithPassword,
    signUpWithPassword,
    signInWithGoogle,
    requestPasswordReset,
    completePasswordRecovery,
    loading: authLoading,
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
  const [signupLegal, setSignupLegal] = useState<SignupLegalFieldState>(INITIAL_SIGNUP_LEGAL);
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
    if (nextMode === 'signup') {
      setSignupLegal(INITIAL_SIGNUP_LEGAL);
    }
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
      try {
        const consents = await api.getLegalConsents();
        if (!hasAcceptedRequiredLegalConsents(consents)) {
          if (!cancelled) {
            setGlobalError(LC.legalConsentsUpdateRequired);
            navigate(`${APP_ROUTE_PATHS.settings}#legal-consents`, { replace: true });
          }
          return;
        }
      } catch {
        // Consent check is best-effort. Do not block sign-in if the endpoint is temporarily unavailable.
      }
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

    if (mode === 'signup') {
      if (!signupLegal.acceptTos) {
        setGlobalError(LEGAL_SIGNUP_COPY_EN.validationTos);
        return;
      }
      if (!signupLegal.acceptPrivacy) {
        setGlobalError(LEGAL_SIGNUP_COPY_EN.validationPrivacy);
        return;
      }
    }

    setLoading(true);
    clearErrors();

    try {
      if (mode === 'signin') {
        const { error } = await authService.signIn(trimmedEmail, password);
        logger.info('Login: signInWithPassword result', { hasError: !!error, errorMessage: error?.message });
        if (error) {
          setGlobalError(error.message);
          setLoading(false);
        }
        // Success: keep loading until session + redirect (avoids form flashing before onAuthStateChange).
        return;
      }
      const { error, session: signUpSession } = await authService.signUp(trimmedEmail, password);
      logger.info('Login: signUpWithPassword result', { hasError: !!error, errorMessage: error?.message });
      if (error) {
        setGlobalError(error.message);
        setLoading(false);
        return;
      }
      if (!signUpSession) {
        // Email confirmation required — no session yet; restore the form.
        setLoading(false);
        return;
      }
      try {
        const events = buildSignupLegalConsentEvents(signupLegal);
        await api.postLegalConsents({ source: 'signup', events });
      } catch (e) {
        logger.warn('Login: legal consent post failed', {
          message: e instanceof Error ? e.message : String(e),
        });
      }
      // Session created: keep loading until redirect effect runs.
    } catch (error) {
      setGlobalError(mapUnknownLoginError(error, 'Authentication failed. Please try again.'));
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
        setLoading(false);
        return;
      }
      setRecoveryPassword('');
      setRecoveryConfirm('');
      // Success: keep loading until post-recovery redirect.
    } catch (error) {
      setGlobalError(mapUnknownLoginError(error, 'Unable to update password. Please try again.'));
      setLoading(false);
    }
  }

  async function handleGoogle() {
    if (loading) return;
    setLoading(true);
    clearErrors();
    try {
      const { error } = await authService.signInWithGoogle();
      if (!error) {
        // Browser navigates to the IdP; keep loading to avoid a one-frame form flash.
        return;
      }
      const message = (error.message ?? '').toLowerCase();
      if (message.includes('manual linking')) {
        setGlobalError(LOGIN_GOOGLE_MANUAL_LINKING_HINT_EN);
        setLoading(false);
        return;
      }
      setGlobalError(error.message);
    } catch (error) {
      setGlobalError(mapUnknownLoginError(error, 'Google sign-in failed. Please try again.'));
    }
    setLoading(false);
  }

  const baseReady = email.trim().length > 0 && password.length > 0;
  const isReady =
    mode === 'signup' ? baseReady && signupLegal.acceptTos && signupLegal.acceptPrivacy : baseReady;
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
  const isOAuthCallbackProcessing = useMemo(() => {
    if (!authLoading) {
      return false;
    }
    const { search, hash } = window.location;
    return (
      search.includes('code=') ||
      search.includes('error=') ||
      hash.includes('access_token=') ||
      hash.includes('refresh_token=') ||
      hash.includes('provider_token=') ||
      hash.includes('provider_refresh_token=') ||
      hash.includes('sb=') ||
      hash.includes('error=')
    );
  }, [authLoading]);

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
    isOAuthCallbackProcessing,
    motionPolicy: LOGIN_UI_POLICY.motion,
    authTabIds: LOGIN_UI_POLICY.authTabIds,
    errorIds: LOGIN_UI_POLICY.errorIds,
    minPasswordLength: LOGIN_UI_POLICY.minPasswordLength,
    signupLegal,
    onSignupLegalChange: (patch: Partial<SignupLegalFieldState>) => {
      setSignupLegal(prev => ({ ...prev, ...patch }));
    },
  };
}
