import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { ArrowRight, Eye, EyeSlash, Lock } from '@phosphor-icons/react';
import { useAuth, isAnonymousUser } from '../hooks/useAuth';
import { logger } from '../lib/logger';
import { ThemeToggle } from '../components/ThemeToggle';
import { api, ApiError } from '../data/apiService';
import { GLC_DISCOVERY_SESSION_TOKEN_STORAGE_KEY } from '../lib/storage-keys';
import { clearPendingSnapshotToken, getPendingSnapshotToken } from '../lib/snapshot-pending-token';
import { LOGIN_GOOGLE_MANUAL_LINKING_HINT_EN, LOGIN_PAGE_COPY_EN as LC } from '../config/login-copy.en';

type AuthMode = 'signin' | 'signup' | 'forgot';

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
  const [error, setError] = useState<string | null>(null);
  const [forgotSent, setForgotSent] = useState(false);

  useEffect(() => {
    const discovery = new URLSearchParams(window.location.search).get('discovery');
    if (discovery) localStorage.setItem(GLC_DISCOVERY_SESSION_TOKEN_STORAGE_KEY, discovery);
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
        navigate('/audit/new?from_discovery=1', { replace: true });
        return;
      }
      const nextRaw = new URLSearchParams(window.location.search).get('next');
      if (nextRaw && nextRaw.startsWith('/') && !nextRaw.startsWith('//')) {
        logger.info('Login: isAuthenticated, navigating to post-login next', { next: nextRaw });
        navigate(nextRaw, { replace: true });
        return;
      }
      logger.info('Login: isAuthenticated, navigating to /portfolio');
      navigate('/portfolio', { replace: true });
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, navigate, user, passwordRecoveryMode]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    setError(null);

    if (mode === 'signin') {
      const { error: err } = await signInWithPassword(email.trim(), password);
      logger.info('Login: signInWithPassword result', { hasError: !!err, errorMessage: err?.message });
      setLoading(false);
      if (err) setError(err.message);
      return;
    }

    const { error: err } = await signUpWithPassword(email.trim(), password);
    logger.info('Login: signUpWithPassword result', { hasError: !!err, errorMessage: err?.message });
    setLoading(false);
    if (err) {
      setError(err.message);
    }
  }

  async function handleForgotSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    setForgotSent(false);
    const { error: err } = await requestPasswordReset(email.trim());
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setForgotSent(true);
  }

  async function handleRecoverySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (recoveryPassword.length < 8) {
      setError(LC.errorPasswordMinLength);
      return;
    }
    if (recoveryPassword !== recoveryConfirm) {
      setError(LC.errorPasswordsMismatch);
      return;
    }
    setLoading(true);
    setError(null);
    const { error: err } = await completePasswordRecovery(recoveryPassword);
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setRecoveryPassword('');
    setRecoveryConfirm('');
  }

  async function handleGoogle() {
    setError(null);
    const { error: err } = await signInWithGoogle({ preserveGuestSession: false });
    if (!err) return;
    const msg = (err.message ?? '').toLowerCase();
    if (msg.includes('manual linking')) {
      setError(LOGIN_GOOGLE_MANUAL_LINKING_HINT_EN);
      return;
    }
    setError(err.message);
  }

  const isReady = email.trim() && password.length > 0;
  const submitLabel = mode === 'signin' ? LC.submitSignIn : LC.submitCreateAccount;

  return (
    <main
      className="relative flex min-h-screen flex-col items-center justify-center px-6 py-12"
      style={{ backgroundColor: 'var(--bg-canvas)' }}
    >
      <div className="absolute top-4 right-4 z-20 sm:top-6 sm:right-6">
        <ThemeToggle />
      </div>

      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'var(--mesh-brand)', opacity: 0.55 }}
      />

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full"
        style={{ maxWidth: 440 }}
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.75, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.08, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="mb-4"
          >
            <Link
              to="/"
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
                <span className="text-[#444343] dark:text-[#DEDEDE]">{LC.brandWordmarkPrimary}</span>
                <span className="text-[rgba(68,67,67,0.78)] dark:text-[#e5e7ebb8]">{LC.brandWordmarkSecondary}</span>
              </h1>
            </Link>
          </motion.div>
          <p className="mt-2" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
            {LC.tagline}
          </p>
        </div>

        <div
          className="glc-card p-6 space-y-5"
          style={{ borderRadius: 'var(--radius-2xl)', boxShadow: 'var(--shadow-lg)' }}
        >
          {!passwordRecoveryMode && mode !== 'forgot' && (
          <div className="flex rounded-lg p-0.5" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
            <button
              type="button"
              onClick={() => { setMode('signin'); setError(null); setForgotSent(false); }}
              className="flex-1 py-2 text-sm font-medium rounded-md transition-colors"
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
              type="button"
              onClick={() => { setMode('signup'); setError(null); setForgotSent(false); }}
              className="flex-1 py-2 text-sm font-medium rounded-md transition-colors"
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
                  {LC.recoveryIntroBeforeEmail}<span className="font-mono">{user.email}</span>
                  {LC.recoveryIntroAfterEmail}
                </p>
                <form onSubmit={handleRecoverySubmit} className="space-y-3">
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={recoveryPassword}
                      onChange={e => setRecoveryPassword(e.target.value)}
                      placeholder={LC.placeholderNewPassword}
                      required
                      minLength={8}
                      autoComplete="new-password"
                      className="w-full pl-9 pr-11 py-3 bg-transparent outline-none"
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
                      className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex"
                      style={{ color: 'var(--text-tertiary)', border: 'none', background: 'transparent', cursor: 'pointer' }}
                    >
                      {showPassword ? <EyeSlash className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <input
                    type="password"
                    value={recoveryConfirm}
                    onChange={e => setRecoveryConfirm(e.target.value)}
                    placeholder={LC.placeholderConfirmNewPassword}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="w-full px-4 py-3 bg-transparent outline-none"
                    style={{
                      borderRadius: 'var(--radius-lg)',
                      border: '1px solid var(--border-default)',
                      backgroundColor: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      fontSize: 'var(--text-sm)',
                    }}
                  />
                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={!loading ? { scale: 1.015 } : {}}
                    whileTap={!loading ? { scale: 0.985 } : {}}
                    className="w-full flex items-center justify-center gap-2 py-3 font-semibold"
                    style={{
                      borderRadius: 'var(--radius-lg)',
                      background: 'var(--gradient-accent)',
                      color: 'var(--primary-foreground)',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontSize: 'var(--text-sm)',
                      border: 'none',
                      boxShadow: '0 4px 14px rgba(242,79,29,0.28)',
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
                  className="text-xs font-medium"
                  style={{ color: 'var(--glc-blue)', border: 'none', background: 'transparent', cursor: 'pointer' }}
                  onClick={() => { setMode('signin'); setError(null); setForgotSent(false); }}
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
                  <p className="text-sm rounded-lg px-3 py-2" style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                    {LC.forgotSentPrefix}<span className="font-mono">{email.trim()}</span>{LC.forgotSentSuffix}
                  </p>
                ) : (
                  <form onSubmit={handleForgotSubmit} className="space-y-3">
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder={LC.placeholderEmail}
                      required
                      autoComplete="email"
                      className="w-full px-4 py-3 bg-transparent outline-none"
                      style={{
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-surface)',
                        color: 'var(--text-primary)',
                        fontSize: 'var(--text-sm)',
                      }}
                    />
                    <motion.button
                      type="submit"
                      disabled={loading || !email.trim()}
                      whileHover={!loading && email.trim() ? { scale: 1.015 } : {}}
                      className="w-full flex items-center justify-center gap-2 py-3 font-semibold"
                      style={{
                        borderRadius: 'var(--radius-lg)',
                        background: email.trim() ? 'var(--gradient-accent)' : 'var(--border-default)',
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
              <p className="mb-3 rounded-lg px-3 py-2 text-xs leading-snug" style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                {LC.anonymousHint}
              </p>
            )}

            {!passwordRecoveryMode && mode !== 'forgot' && (
            <>
            <button
              onClick={handleGoogle}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-medium text-sm"
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                transition: 'border-color var(--ease-fast), box-shadow var(--ease-fast)',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--glc-blue)';
                (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-blue)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)';
                (e.currentTarget as HTMLElement).style.boxShadow = 'none';
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
              <span style={{ color: 'var(--text-quaternary)', fontSize: '11px' }}>{LC.dividerOr}</span>
              <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border-subtle)' }} />
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="email"
                name="username"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={LC.placeholderEmail}
                required
                autoComplete={mode === 'signin' ? 'username' : 'email'}
                className="w-full px-4 py-3 bg-transparent outline-none"
                style={{
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  fontSize: 'var(--text-sm)',
                  transition: 'border-color var(--ease-fast), box-shadow var(--ease-fast)',
                }}
                onFocus={e => { e.target.style.borderColor = 'var(--glc-blue)'; e.target.style.boxShadow = 'var(--shadow-blue)'; }}
                onBlur={e => { e.target.style.borderColor = 'var(--border-default)'; e.target.style.boxShadow = 'none'; }}
              />
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={LC.placeholderPassword}
                  required
                  minLength={6}
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  className="w-full pl-9 pr-11 py-3 bg-transparent outline-none"
                  style={{
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border-default)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: 'var(--text-sm)',
                    transition: 'border-color var(--ease-fast), box-shadow var(--ease-fast)',
                  }}
                  onFocus={e => { e.target.style.borderColor = 'var(--glc-blue)'; e.target.style.boxShadow = 'var(--shadow-blue)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--border-default)'; e.target.style.boxShadow = 'none'; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  aria-label={showPassword ? LC.ariaHidePassword : LC.ariaShowPassword}
                  className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center justify-center"
                  style={{ color: 'var(--text-tertiary)', border: 'none', background: 'transparent', cursor: 'pointer' }}
                >
                  {showPassword ? <EyeSlash className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {mode === 'signin' && (
                <div className="flex justify-end -mt-1">
                  <button
                    type="button"
                    className="text-xs font-medium"
                    style={{ color: 'var(--glc-blue)', border: 'none', background: 'transparent', cursor: 'pointer' }}
                    onClick={() => { setMode('forgot'); setError(null); setForgotSent(false); }}
                  >
                    {LC.forgotPasswordLink}
                  </button>
                </div>
              )}
              {mode === 'signup' && (
                <p className="text-xs" style={{ color: 'var(--text-quaternary)' }}>
                  {LC.signupPasswordHint}
                </p>
              )}
              <motion.button
                type="submit"
                disabled={loading || !isReady}
                whileHover={!loading ? { scale: 1.015 } : {}}
                whileTap={!loading ? { scale: 0.985 } : {}}
                className="w-full flex items-center justify-center gap-2 py-3 font-semibold"
                style={{
                  borderRadius: 'var(--radius-lg)',
                  background: isReady ? 'var(--gradient-accent)' : 'var(--border-default)',
                  color: isReady ? 'var(--primary-foreground)' : 'var(--text-tertiary)',
                  cursor: isReady && !loading ? 'pointer' : 'not-allowed',
                  fontSize: 'var(--text-sm)',
                  border: 'none',
                  boxShadow: isReady ? '0 4px 14px rgba(242,79,29,0.28)' : 'none',
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

          {(error || authError) && (
            <p className="text-center text-sm" style={{ color: 'var(--score-1)' }}>
              {error ?? authError}
            </p>
          )}
        </div>

        <p className="mt-5 text-center text-xs" style={{ color: 'var(--text-quaternary)' }}>
          {LC.footerTerms}{' '}
          <Link to="/faq" className="underline-offset-2 hover:underline" style={{ color: 'var(--text-tertiary)' }}>
            {LC.footerFaq}
          </Link>
        </p>
      </motion.div>
    </main>
  );
}
