import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { Globe, Mail, ArrowRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { logger } from '../lib/logger';

export function Login() {
  const navigate = useNavigate();
  const { signInWithEmail, signInWithGoogle, isAuthenticated, authError } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      logger.info('Login: isAuthenticated, navigating to /portfolio');
      navigate('/portfolio', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    logger.info('Login: handleEmail submit', { email });
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    const { error: err } = await signInWithEmail(email);
    logger.info('Login: signInWithEmail result', { hasError: !!err, errorMessage: err?.message });
    setLoading(false);
    if (err) {
      setError(err.message);
    } else {
      setSent(true);
    }
  }

  async function handleGoogle() {
    console.log('[Login] handleGoogle click');
    setError(null);
    const { error: err } = await signInWithGoogle();
    console.log('[Login] signInWithGoogle result', err);
    if (err) setError(err.message);
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 relative"
      style={{ backgroundColor: 'var(--bg-canvas)' }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'var(--mesh-brand)', opacity: 0.55 }}
      />

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full"
        style={{ maxWidth: 400 }}
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.75, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.08, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{
              background: 'var(--gradient-brand)',
              boxShadow: '0 8px 28px rgba(28,189,255,0.32), 0 2px 8px rgba(0,0,0,0.14)',
            }}
          >
            <Globe className="w-7 h-7 text-white" />
          </motion.div>

          <h1
            style={{
              fontSize: 'var(--text-2xl)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              letterSpacing: 'var(--tracking-tight)',
            }}
          >
            GLC Audit Platform
          </h1>
          <p className="mt-2" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
            Sign in to access your audit workspace
          </p>
        </div>

        {/* Card */}
        <div
          className="glc-card p-6 space-y-5"
          style={{ borderRadius: 'var(--radius-2xl)', boxShadow: 'var(--shadow-lg)' }}
        >
          <AnimatePresence mode="wait">
            {sent ? (
              <motion.div
                key="sent"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-4"
              >
                <Mail className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--glc-green)' }} />
                <h2
                  className="font-semibold"
                  style={{ color: 'var(--text-primary)', fontSize: 'var(--text-base)', fontFamily: 'var(--font-display)' }}
                >
                  Check your email
                </h2>
                <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  We sent a magic link to <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>
                </p>
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {/* Google */}
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
                  Continue with Google
                </button>

                {/* Divider */}
                <div className="flex items-center gap-3 my-5">
                  <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border-subtle)' }} />
                  <span style={{ color: 'var(--text-quaternary)', fontSize: '11px' }}>or</span>
                  <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border-subtle)' }} />
                </div>

                {/* Email */}
                <form onSubmit={handleEmail} className="space-y-3">
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
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
                  <motion.button
                    type="submit"
                    disabled={loading || !email.trim()}
                    whileHover={!loading ? { scale: 1.015 } : {}}
                    whileTap={!loading ? { scale: 0.985 } : {}}
                    className="w-full flex items-center justify-center gap-2 py-3 text-white font-semibold"
                    style={{
                      borderRadius: 'var(--radius-lg)',
                      background: email.trim() ? 'var(--gradient-accent)' : 'var(--border-default)',
                      cursor: email.trim() && !loading ? 'pointer' : 'not-allowed',
                      fontSize: 'var(--text-sm)',
                      border: 'none',
                      boxShadow: email.trim() ? '0 4px 14px rgba(242,79,29,0.28)' : 'none',
                    }}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        Sending...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        Send Magic Link <ArrowRight className="w-4 h-4" />
                      </span>
                    )}
                  </motion.button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {(error || authError) && (
            <p className="text-center text-sm" style={{ color: 'var(--score-1)' }}>
              {error ?? authError}
            </p>
          )}
        </div>

        <p className="text-center mt-5" style={{ fontSize: '11px', color: 'var(--text-quaternary)' }}>
          By signing in, you agree to our Terms of Service.
        </p>
      </motion.div>
    </div>
  );
}
