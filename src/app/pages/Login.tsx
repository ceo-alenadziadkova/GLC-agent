import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, Eye, EyeSlash, Lock } from '@phosphor-icons/react';
import { useAuth, isAnonymousUser } from '../hooks/useAuth';
import { logger } from '../lib/logger';
import { ThemeToggle } from '../components/ThemeToggle';
import { api, ApiError } from '../data/apiService';
import { GLC_DISCOVERY_SESSION_TOKEN_STORAGE_KEY } from '../lib/storage-keys';
import { clearPendingSnapshotToken, getPendingSnapshotToken } from '../lib/snapshot-pending-token';
import { LOGIN_GOOGLE_MANUAL_LINKING_HINT_EN, LOGIN_PAGE_COPY_EN as LC } from '../config/login-copy.en';
import { BACKGROUND_VIDEO_CONFIG } from '../config/background-video';
import { APP_ROUTE_PATHS, buildAppRoute } from '../config/route-paths';

type AuthMode = 'signin' | 'signup' | 'forgot';
const EMAIL_VALIDATION_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const LOGIN_TAB_ORDER: readonly AuthMode[] = ['signin', 'signup'];

type FieldErrors = {
  email: string | null;
  password: string | null;
  recoveryPassword: string | null;
  recoveryConfirm: string | null;
};

const EMPTY_FIELD_ERRORS: FieldErrors = {
  email: null,
  password: null,
  recoveryPassword: null,
  recoveryConfirm: null,
};

function getSafeNextPath(nextRaw: string | null): string | null {
  if (!nextRaw || !nextRaw.startsWith('/') || nextRaw.startsWith('//')) {
    return null;
  }
  try {
    const parsed = new URL(nextRaw, window.location.origin);
    if (parsed.pathname === APP_ROUTE_PATHS.login) {
      return null;
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

export function Login() {
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
  const reduceMotion = useReducedMotion();
  const signInTabRef = useRef<HTMLButtonElement | null>(null);
  const signUpTabRef = useRef<HTMLButtonElement | null>(null);

  const emailErrorId = 'login-email-error';
  const passwordErrorId = 'login-password-error';
  const recoveryPasswordErrorId = 'login-recovery-password-error';
  const recoveryConfirmErrorId = 'login-recovery-confirm-error';

  function clearErrors() {
    setGlobalError(null);
    setFieldErrors(EMPTY_FIELD_ERRORS);
  }

  function activateMode(nextMode: AuthMode) {
    setMode(nextMode);
    clearErrors();
    setForgotSent(false);
  }

  function focusAuthTab(modeToFocus: AuthMode) {
    if (modeToFocus === 'signin') {
      signInTabRef.current?.focus();
      return;
    }
    signUpTabRef.current?.focus();
  }

  function handleAuthTabsKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && event.key !== 'Home' && event.key !== 'End') {
      return;
    }
    event.preventDefault();
    const activeIndex = LOGIN_TAB_ORDER.findIndex(tab => tab === mode);
    if (activeIndex === -1) return;
    if (event.key === 'Home') {
      activateMode('signin');
      focusAuthTab('signin');
      return;
    }
    if (event.key === 'End') {
      activateMode('signup');
      focusAuthTab('signup');
      return;
    }
    const delta = event.key === 'ArrowRight' ? 1 : -1;
    const nextIndex = (activeIndex + delta + LOGIN_TAB_ORDER.length) % LOGIN_TAB_ORDER.length;
    const nextMode = LOGIN_TAB_ORDER[nextIndex] as AuthMode;
    activateMode(nextMode);
    focusAuthTab(nextMode);
  }

  useEffect(() => {
    const discovery = new URLSearchParams(window.location.search).get('discovery');
    if (discovery) localStorage.setItem(GLC_DISCOVERY_SESSION_TOKEN_STORAGE_KEY, discovery);
  }, []);

  useEffect(() => {
    const desktopMedia = window.matchMedia('(min-width: 1024px)');
    const applyMediaState = () => setIsDesktopTwoColumn(desktopMedia.matches);
    applyMediaState();
    desktopMedia.addEventListener('change', applyMediaState);
    return () => {
      desktopMedia.removeEventListener('change', applyMediaState);
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
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
      const pendingSnapshot = getPendingSnapshotToken();
      if (pendingSnapshot) {
        try {
          await api.claimSnapshot(pendingSnapshot);
          clearPendingSnapshotToken();
          logger.info('Login: pending snapshot claimed');
        } catch (e) {
          if (e instanceof ApiError && (e.status === 404 || e.status === 409 || e.status === 410)) {
            clearPendingSnapshotToken();
          }
          logger.warn('Login: snapshot claim failed', {
            message: e instanceof Error ? e.message : String(e),
          });
        }
      }
      if (cancelled) return;

      const token = localStorage.getItem(GLC_DISCOVERY_SESSION_TOKEN_STORAGE_KEY);
      if (token) {
        logger.info('Login: isAuthenticated with discovery token, navigating to /audit/new');
        navigate(buildAppRoute.auditNewFromDiscovery(), { replace: true });
        return;
      }
      const nextRaw = new URLSearchParams(window.location.search).get('next');
      const safeNext = getSafeNextPath(nextRaw);
      if (safeNext) {
        logger.info('Login: isAuthenticated, navigating to post-login next', { next: safeNext });
        navigate(safeNext, { replace: true });
        return;
      }
      logger.info('Login: isAuthenticated, navigating to /portfolio');
      navigate(APP_ROUTE_PATHS.portfolio, { replace: true });
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, navigate, user, passwordRecoveryMode]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) return;
    if (!EMAIL_VALIDATION_PATTERN.test(trimmedEmail)) {
      setFieldErrors(prev => ({ ...prev, email: LC.errorInvalidEmail }));
      return;
    }
    if (mode === 'signup' && password.length < MIN_PASSWORD_LENGTH) {
      setFieldErrors(prev => ({ ...prev, password: LC.errorPasswordMinLength }));
      return;
    }
    setLoading(true);
    clearErrors();

    try {
      if (mode === 'signin') {
        const { error: err } = await signInWithPassword(trimmedEmail, password);
        logger.info('Login: signInWithPassword result', { hasError: !!err, errorMessage: err?.message });
        if (err) {
          setGlobalError(err.message);
        }
        return;
      }
      const { error: err } = await signUpWithPassword(trimmedEmail, password);
      logger.info('Login: signUpWithPassword result', { hasError: !!err, errorMessage: err?.message });
      if (err) {
        setGlobalError(err.message);
      }
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return;
    if (!EMAIL_VALIDATION_PATTERN.test(trimmedEmail)) {
      setFieldErrors(prev => ({ ...prev, email: LC.errorInvalidEmail }));
      return;
    }
    setLoading(true);
    clearErrors();
    setForgotSent(false);
    try {
      const { error: err } = await requestPasswordReset(trimmedEmail);
      if (err) {
        setGlobalError(err.message);
        return;
      }
      setForgotSent(true);
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'Unable to send reset link. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRecoverySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    if (recoveryPassword.length < MIN_PASSWORD_LENGTH) {
      setFieldErrors(prev => ({ ...prev, recoveryPassword: LC.errorPasswordMinLength }));
      return;
    }
    if (recoveryPassword !== recoveryConfirm) {
      setFieldErrors(prev => ({ ...prev, recoveryConfirm: LC.errorPasswordsMismatch }));
      return;
    }
    setLoading(true);
    clearErrors();
    try {
      const { error: err } = await completePasswordRecovery(recoveryPassword);
      if (err) {
        setGlobalError(err.message);
        return;
      }
      setRecoveryPassword('');
      setRecoveryConfirm('');
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'Unable to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    if (loading) return;
    setLoading(true);
    clearErrors();
    try {
      const { error: err } = await signInWithGoogle({ preserveGuestSession: false });
      if (!err) return;
      const msg = (err.message ?? '').toLowerCase();
      if (msg.includes('manual linking')) {
        setGlobalError(LOGIN_GOOGLE_MANUAL_LINKING_HINT_EN);
        return;
      }
      setGlobalError(err.message);
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'Google sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const isReady = email.trim() && password.length > 0;
  const submitLabel = mode === 'signin' ? LC.submitSignIn : LC.submitCreateAccount;
  const loginTagline = passwordRecoveryMode
    ? LC.taglineRecovery
    : mode === 'signup'
      ? LC.taglineSignUp
      : mode === 'forgot'
        ? LC.taglineForgot
        : LC.taglineSignIn;
  const formClosedClipPath = isDesktopTwoColumn
    ? 'inset(0 0 100% 0 round 0 var(--radius-2xl) var(--radius-2xl) 0)'
    : 'inset(0 0 100% 0 round var(--radius-2xl))';
  const formOpenClipPath = isDesktopTwoColumn
    ? 'inset(0 0 0% 0 round 0 var(--radius-2xl) var(--radius-2xl) 0)'
    : 'inset(0 0 0% 0 round var(--radius-2xl))';

  return (
    <main
      className="glc-login-main relative"
      style={{ backgroundColor: 'var(--bg-canvas)' }}
    >
      <div className="glc-login-theme-toggle absolute top-4 right-4 sm:top-6 sm:right-6">
        <ThemeToggle />
      </div>

      <div
        className="glc-login-bg-mesh absolute inset-0 pointer-events-none"
        style={{ background: 'var(--mesh-brand)', opacity: 0.55 }}
      />

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
        className="glc-login-layout relative flex w-full flex-col gap-10 lg:grid lg:grid-cols-2 lg:gap-0"
      >
        <div className="glc-login-layout-video-layer" aria-hidden="true">
          {!reduceMotion && (
            <video
              className="glc-login-layout-video"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
            >
              <source src={BACKGROUND_VIDEO_CONFIG.src} type="video/webm" />
            </video>
          )}
          <div
            className="glc-login-layout-video-overlay"
            style={{ opacity: BACKGROUND_VIDEO_CONFIG.overlayOpacity }}
          />
        </div>

        <motion.div
          className="glc-login-form-column w-full lg:order-1 lg:max-w-none lg:flex-shrink-0"
          initial={reduceMotion ? false : { opacity: 0, y: 12, clipPath: formClosedClipPath }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0, clipPath: formOpenClipPath }}
          transition={{ duration: 0.45, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
        <div className="glc-login-brand text-center mb-8 md:text-left">
          <motion.div
            initial={{ scale: 0.75, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.08, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="mb-4"
          >
            <Link
              to={APP_ROUTE_PATHS.home}
              className="inline-flex items-center justify-center gap-3"
              style={{ textDecoration: 'none' }}
              aria-label={LC.ariaHome}
            >
              <img
                src="/logo-simple.svg"
                alt=""
                className="h-10 w-auto max-w-[min(72px,20vw)] shrink-0"
                width={68}
                height={72}
                decoding="async"
              />
              <h1
                className="font-logo leading-none"
                style={{
                  fontSize: 'var(--text-2xl)',
                  fontWeight: 700,
                  letterSpacing: 'var(--tracking-tight)',
                }}
              >
                <span style={{ color: 'var(--text-primary)' }}>{LC.brandWordmarkPrimary}</span>
                <span style={{ color: 'var(--text-secondary)' }}>{LC.brandWordmarkSecondary}</span>
              </h1>
            </Link>
          </motion.div>
          <p className="glc-login-brand-tagline mt-2" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
            {loginTagline}
          </p>
        </div>

        <div
          className="glc-card glc-auth-card p-6 space-y-5"
          style={{ borderRadius: 'var(--radius-2xl)', boxShadow: 'var(--shadow-lg)' }}
        >
          {!passwordRecoveryMode && mode !== 'forgot' && (
          <div
            className="glc-auth-tabs flex rounded-lg p-0.5"
            role="tablist"
            aria-label={LC.tagline}
            onKeyDown={handleAuthTabsKeyDown}
            style={{ border: '1px solid var(--border-subtle)' }}
          >
            <button
              ref={signInTabRef}
              type="button"
              onClick={() => activateMode('signin')}
              id="auth-tab-signin"
              role="tab"
              aria-selected={mode === 'signin'}
              aria-controls="auth-panel-signin-signup"
              tabIndex={mode === 'signin' ? 0 : -1}
              className="glc-auth-tab flex-1 py-2 text-sm font-medium rounded-md transition-colors"
              style={{
                backgroundColor: mode === 'signin' ? 'var(--bg-canvas)' : 'transparent',
                color: mode === 'signin' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                boxShadow: mode === 'signin' ? 'var(--shadow-sm)' : 'none',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {LC.tabSignIn}
            </button>
            <button
              ref={signUpTabRef}
              type="button"
              onClick={() => activateMode('signup')}
              id="auth-tab-signup"
              role="tab"
              aria-selected={mode === 'signup'}
              aria-controls="auth-panel-signin-signup"
              tabIndex={mode === 'signup' ? 0 : -1}
              className="glc-auth-tab flex-1 py-2 text-sm font-medium rounded-md transition-colors"
              style={{
                backgroundColor: mode === 'signup' ? 'var(--bg-canvas)' : 'transparent',
                color: mode === 'signup' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                boxShadow: mode === 'signup' ? 'var(--shadow-sm)' : 'none',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {LC.tabRegister}
            </button>
          </div>
          )}

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {passwordRecoveryMode && user && !isAnonymousUser(user) && (
              <div className="space-y-4">
                <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {LC.recoveryHeading}
                </h2>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {LC.recoveryIntroBeforeEmail}<span className="font-mono glc-auth-inline-mono">{user.email}</span>
                  {LC.recoveryIntroAfterEmail}
                </p>
                <form onSubmit={handleRecoverySubmit} className="space-y-3">
                  <div className="relative">
                    <label htmlFor="recovery-password" className="sr-only">{LC.labelNewPassword}</label>
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                    <input
                      id="recovery-password"
                      type={showPassword ? 'text' : 'password'}
                      value={recoveryPassword}
                      onChange={e => {
                        setRecoveryPassword(e.target.value);
                        setFieldErrors(prev => ({ ...prev, recoveryPassword: null }));
                      }}
                      placeholder={LC.placeholderNewPassword}
                      required
                      minLength={8}
                      autoComplete="new-password"
                      aria-invalid={Boolean(fieldErrors.recoveryPassword)}
                      aria-describedby={fieldErrors.recoveryPassword ? recoveryPasswordErrorId : undefined}
                      className="glc-auth-input w-full pl-9 pr-11 py-3 bg-transparent outline-none"
                      style={{
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-surface)',
                        color: 'var(--text-primary)',
                        fontSize: 'var(--text-sm)',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(prev => !prev)}
                      aria-label={showPassword ? LC.ariaHidePassword : LC.ariaShowPassword}
                      className="glc-touch-target absolute right-3 top-1/2 -translate-y-1/2 inline-flex"
                      style={{ color: 'var(--text-tertiary)', border: 'none', background: 'transparent', cursor: 'pointer' }}
                    >
                      {showPassword ? <EyeSlash className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {fieldErrors.recoveryPassword && (
                    <p id={recoveryPasswordErrorId} className="text-xs" style={{ color: 'var(--score-1)' }}>
                      {fieldErrors.recoveryPassword}
                    </p>
                  )}
                  <label htmlFor="recovery-confirm" className="sr-only">{LC.labelConfirmNewPassword}</label>
                  <input
                    id="recovery-confirm"
                    type="password"
                    value={recoveryConfirm}
                    onChange={e => {
                      setRecoveryConfirm(e.target.value);
                      setFieldErrors(prev => ({ ...prev, recoveryConfirm: null }));
                    }}
                    placeholder={LC.placeholderConfirmNewPassword}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    aria-invalid={Boolean(fieldErrors.recoveryConfirm)}
                    aria-describedby={fieldErrors.recoveryConfirm ? recoveryConfirmErrorId : undefined}
                    className="glc-auth-input w-full px-4 py-3 bg-transparent outline-none"
                    style={{
                      borderRadius: 'var(--radius-lg)',
                      border: '1px solid var(--border-default)',
                      backgroundColor: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      fontSize: 'var(--text-sm)',
                    }}
                  />
                  {fieldErrors.recoveryConfirm && (
                    <p id={recoveryConfirmErrorId} className="text-xs" style={{ color: 'var(--score-1)' }}>
                      {fieldErrors.recoveryConfirm}
                    </p>
                  )}
                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={!loading ? { scale: 1.015 } : {}}
                    whileTap={!loading ? { scale: 0.985 } : {}}
                    className="w-full flex items-center justify-center gap-2 py-3 font-semibold"
                    style={{
                      borderRadius: 'var(--radius-lg)',
                      background: 'var(--gradient-brand)',
                      color: 'var(--primary-foreground)',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontSize: 'var(--text-sm)',
                      border: 'none',
                      boxShadow: '0 8px 20px color-mix(in oklab, var(--glc-blue) 34%, transparent)',
                      opacity: loading ? 0.7 : 1,
                    }}
                  >
                    {loading ? LC.recoverySubmitSaving : LC.recoverySubmit}
                  </motion.button>
                </form>
              </div>
            )}

            {!passwordRecoveryMode && mode === 'forgot' && (
              <div className="space-y-4">
                <button
                  type="button"
                  className="glc-touch-target text-xs font-medium"
                  style={{ color: 'var(--glc-blue)', border: 'none', background: 'transparent', cursor: 'pointer' }}
                  onClick={() => activateMode('signin')}
                >
                  {LC.forgotBack}
                </button>
                <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {LC.forgotHeading}
                </h2>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {LC.forgotBlurb}
                </p>
                {forgotSent ? (
                  <p role="status" aria-live="polite" className="text-sm rounded-lg px-3 py-2" style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                    {LC.forgotSentPrefix}<span className="font-mono glc-auth-inline-mono">{email.trim()}</span>{LC.forgotSentSuffix}
                  </p>
                ) : (
                  <form onSubmit={handleForgotSubmit} className="space-y-3">
                    <label htmlFor="forgot-email" className="sr-only">{LC.labelEmail}</label>
                    <input
                      id="forgot-email"
                      type="email"
                      value={email}
                      onChange={e => {
                        setEmail(e.target.value);
                        setFieldErrors(prev => ({ ...prev, email: null }));
                      }}
                      placeholder={LC.placeholderEmail}
                      required
                      autoComplete="email"
                      aria-invalid={Boolean(fieldErrors.email)}
                      aria-describedby={fieldErrors.email ? emailErrorId : undefined}
                      className="glc-auth-input w-full px-4 py-3 bg-transparent outline-none"
                      style={{
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-surface)',
                        color: 'var(--text-primary)',
                        fontSize: 'var(--text-sm)',
                      }}
                    />
                    {fieldErrors.email && (
                      <p id={emailErrorId} className="text-xs" style={{ color: 'var(--score-1)' }}>
                        {fieldErrors.email}
                      </p>
                    )}
                    <motion.button
                      type="submit"
                      disabled={loading || !email.trim()}
                      whileHover={!loading && email.trim() ? { scale: 1.015 } : {}}
                      className="w-full flex items-center justify-center gap-2 py-3 font-semibold"
                      style={{
                        borderRadius: 'var(--radius-lg)',
                        background: email.trim() ? 'var(--gradient-brand)' : 'var(--border-default)',
                        color: email.trim() ? 'var(--primary-foreground)' : 'var(--text-tertiary)',
                        cursor: email.trim() && !loading ? 'pointer' : 'not-allowed',
                        fontSize: 'var(--text-sm)',
                        border: 'none',
                      }}
                    >
                      {loading ? LC.forgotSending : LC.forgotSendLink}
                    </motion.button>
                  </form>
                )}
              </div>
            )}

            {!passwordRecoveryMode && mode !== 'forgot' && isAnonymousUser(user) && (
              <div
                className="mb-4 rounded-[var(--radius-xl)] border px-4 py-3"
                style={{
                  borderColor: 'color-mix(in oklab, var(--glc-blue) 45%, var(--border-subtle))',
                  backgroundColor: 'color-mix(in oklab, var(--glc-blue-muted) 42%, transparent)',
                }}
              >
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {LC.anonymousHint}
                </p>
              </div>
            )}

            {!passwordRecoveryMode && mode !== 'forgot' && (
            <>
            <button
              onClick={handleGoogle}
              disabled={loading}
              className="glc-auth-social-btn w-full flex items-center justify-center gap-2 py-3 rounded-lg font-medium text-sm"
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
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
              <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border-subtle)' }} />
              <span style={{ color: 'var(--text-tertiary)', fontSize: '11px' }}>{LC.dividerOr}</span>
              <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border-subtle)' }} />
            </div>

            <form
              id="auth-panel-signin-signup"
              role="tabpanel"
              aria-labelledby={mode === 'signin' ? 'auth-tab-signin' : 'auth-tab-signup'}
              onSubmit={handleSubmit}
              className="space-y-3"
            >
              <label htmlFor="auth-email" className="sr-only">{LC.labelEmail}</label>
              <input
                id="auth-email"
                type="email"
                name="email"
                value={email}
                onChange={e => {
                  setEmail(e.target.value);
                  setFieldErrors(prev => ({ ...prev, email: null }));
                }}
                placeholder={LC.placeholderEmail}
                required
                autoComplete="email"
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? emailErrorId : undefined}
                className="glc-auth-input w-full px-4 py-3 bg-transparent outline-none"
                style={{
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  fontSize: 'var(--text-sm)',
                }}
              />
              {fieldErrors.email && (
                <p id={emailErrorId} className="text-xs" style={{ color: 'var(--score-1)' }}>
                  {fieldErrors.email}
                </p>
              )}
              <div className="relative">
                <label htmlFor="auth-password" className="sr-only">{LC.labelPassword}</label>
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value);
                    setFieldErrors(prev => ({ ...prev, password: null }));
                  }}
                  placeholder={LC.placeholderPassword}
                  required
                  minLength={mode === 'signup' ? MIN_PASSWORD_LENGTH : 1}
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={fieldErrors.password ? passwordErrorId : undefined}
                  className="glc-auth-input w-full pl-9 pr-11 py-3 bg-transparent outline-none"
                  style={{
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border-default)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: 'var(--text-sm)',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  aria-label={showPassword ? LC.ariaHidePassword : LC.ariaShowPassword}
                  className="glc-touch-target absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center justify-center"
                  style={{ color: 'var(--text-tertiary)', border: 'none', background: 'transparent', cursor: 'pointer' }}
                >
                  {showPassword ? <EyeSlash className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {fieldErrors.password && (
                <p id={passwordErrorId} className="text-xs" style={{ color: 'var(--score-1)' }}>
                  {fieldErrors.password}
                </p>
              )}
              {mode === 'signin' && (
                <div className="flex justify-end -mt-1">
                  <button
                    type="button"
                    className="glc-touch-target text-xs font-medium"
                    style={{ color: 'var(--glc-blue)', border: 'none', background: 'transparent', cursor: 'pointer' }}
                    onClick={() => activateMode('forgot')}
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
                whileHover={!loading ? { scale: 1.015 } : {}}
                whileTap={!loading ? { scale: 0.985 } : {}}
                className="glc-auth-primary-btn w-full flex items-center justify-center gap-2 py-3 font-semibold"
                style={{
                  borderRadius: 'var(--radius-lg)',
                  background: isReady ? 'var(--gradient-brand)' : 'var(--border-default)',
                  color: isReady ? 'var(--primary-foreground)' : 'var(--text-tertiary)',
                  cursor: isReady && !loading ? 'pointer' : 'not-allowed',
                  fontSize: 'var(--text-sm)',
                  border: 'none',
                  boxShadow: isReady ? '0 8px 20px color-mix(in oklab, var(--glc-blue) 34%, transparent)' : 'none',
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
            )}

          </motion.div>

          {(globalError || authError) && (
            <p role="alert" aria-live="assertive" className="text-center text-sm" style={{ color: 'var(--score-1)' }}>
              {globalError ?? authError}
            </p>
          )}
        </div>

        <p className="mt-5 w-full text-center text-xs" style={{ color: 'var(--text-tertiary)' }}>
          {LC.footerTerms}{' '}
          <Link to={APP_ROUTE_PATHS.faq} className="underline-offset-2 hover:underline" style={{ color: 'var(--glc-blue)' }}>
            {LC.footerFaq}
          </Link>
        </p>
        </motion.div>

        <motion.aside
          className="relative hidden lg:flex lg:order-2 lg:w-full lg:min-h-screen lg:items-end lg:justify-end lg:px-10 lg:pb-10"
          initial={reduceMotion ? false : { opacity: 0, x: 16 }}
          animate={reduceMotion ? undefined : { opacity: 1, x: 0 }}
          transition={{ duration: 0.36, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
        >
          <motion.p
            className="glc-login-aside-floating-title glc-login-aside-title pointer-events-none absolute inset-0 flex items-center justify-center px-10 text-center font-display text-lg font-bold tracking-tight lg:text-xl"
            style={{ color: 'var(--text-primary)' }}
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.34, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
          >
            {LC.authShellAsideTitle}
          </motion.p>

          <div className="glc-login-aside-content glc-login-layout-side-panel w-full md:max-w-[34rem] md:p-6">
            <div className="glc-login-side-bottom">
              <ul className="glc-login-side-signals grid grid-cols-3 gap-2">
                {LC.authShellTrustSignals.map(signal => (
                  <li key={signal} className="glc-login-aside-signal flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <span className="glc-login-aside-signal-dot" aria-hidden />
                    {signal}
                  </li>
                ))}
              </ul>

              <p className="glc-login-aside-links glc-login-side-caption text-xs leading-relaxed" style={{ color: 'var(--text-quaternary)' }}>
                {LC.asideIntroPrefix}
                <Link to={APP_ROUTE_PATHS.snapshot} className="underline-offset-2 hover:underline" style={{ color: 'var(--glc-blue)' }}>
                  {LC.asideSnapshotLinkLabel}
                </Link>{' '}
                {LC.asideIntroMiddle}
                <Link to={APP_ROUTE_PATHS.brief} className="underline-offset-2 hover:underline" style={{ color: 'var(--glc-blue)' }}>
                  {LC.asideBriefLinkLabel}
                </Link>
                {LC.asideIntroSuffix}
              </p>
            </div>
          </div>
        </motion.aside>
      </motion.div>
    </main>
  );
}
