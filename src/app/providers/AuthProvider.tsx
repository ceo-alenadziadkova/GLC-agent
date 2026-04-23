import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { invalidateGlcSessionDataCaches } from '../lib/glc-session-data-cache';
import { logger } from '../lib/logger';
import {
  clearPreviewSessionBackup,
  isAnonymousUser,
  persistPreviewSessionBackupIfAnonymous,
} from '../lib/snapshot-auth';
import { APP_ROUTE_PATHS } from '../config/route-paths';

/** Supabase GoTrue emits this when the user opens a password recovery link. */
const PASSWORD_RECOVERY_EVENT = 'PASSWORD_RECOVERY' as const;
const AUTH_REDIRECT_PATH = APP_ROUTE_PATHS.login;

type SignInWithGoogleOptions = {
  /**
   * Preserve anonymous snapshot user id by linking Google identity.
   * Keep this false for normal login to avoid identity-linking conflicts.
   */
  preserveGuestSession?: boolean;
};

export type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  authError: string | null;
  passwordRecoveryMode: boolean;
  signInWithPassword: (email: string, password: string) => Promise<{ error: { message?: string } | null }>;
  signUpWithPassword: (
    email: string,
    password: string,
  ) => Promise<{ error: { message?: string } | null; session: Session | null }>;
  requestPasswordReset: (email: string) => Promise<{ error: { message?: string } | null }>;
  completePasswordRecovery: (password: string) => Promise<{ error: { message?: string } | null }>;
  signInWithGoogle: (options?: SignInWithGoogleOptions) => Promise<{ error: { message?: string } | null }>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [passwordRecoveryMode, setPasswordRecoveryMode] = useState(false);

  useEffect(() => {
    logger.debug('AuthProvider mounted');
    let isMounted = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      logger.info('onAuthStateChange', { event, hasSession: !!nextSession, userId: nextSession?.user.id });
      if (!isMounted) return;
      if (event === PASSWORD_RECOVERY_EVENT) {
        setPasswordRecoveryMode(true);
      }
      if (event === 'SIGNED_OUT') {
        setPasswordRecoveryMode(false);
      }
      if (nextSession === null) {
        invalidateGlcSessionDataCaches();
        clearPreviewSessionBackup();
      } else if (isAnonymousUser(nextSession.user)) {
        persistPreviewSessionBackupIfAnonymous(nextSession);
      } else {
        clearPreviewSessionBackup();
      }
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    });

    async function initAuth() {
      logger.info('Auth init start');
      try {
        const href = window.location.href;
        const referrer = document.referrer;
        logger.debug('Auth document.referrer', { referrer });

        const url = new URL(href);
        const cleanupAuthUrl = (target: URL) => {
          target.searchParams.delete('code');
          target.searchParams.delete('access_token');
          target.searchParams.delete('refresh_token');
          target.searchParams.delete('provider_token');
          target.searchParams.delete('provider_refresh_token');
          target.searchParams.delete('sb');
          if (target.hash) {
            const hashParams = new URLSearchParams(target.hash.startsWith('#') ? target.hash.slice(1) : target.hash);
            hashParams.delete('access_token');
            hashParams.delete('refresh_token');
            hashParams.delete('expires_in');
            hashParams.delete('expires_at');
            hashParams.delete('token_type');
            hashParams.delete('type');
            hashParams.delete('provider_token');
            hashParams.delete('provider_refresh_token');
            hashParams.delete('sb');
            const cleanedHash = hashParams.toString();
            target.hash = cleanedHash ? `#${cleanedHash}` : '';
          }
          const qs = target.searchParams.toString();
          window.history.replaceState({}, '', `${target.pathname}${qs ? `?${qs}` : ''}${target.hash}`);
        };

        let oauthRedirectError: string | null = null;
        const oauthErr = url.searchParams.get('error');
        const oauthDesc = url.searchParams.get('error_description');
        if (oauthErr) {
          oauthRedirectError = oauthDesc
            ? decodeURIComponent(oauthDesc.replace(/\+/g, ' '))
            : oauthErr;
          logger.error('OAuth redirect error', { oauthErr, oauthRedirectError });
          url.searchParams.delete('error');
          url.searchParams.delete('error_description');
          url.searchParams.delete('error_code');
          const qs = url.searchParams.toString();
          window.history.replaceState({}, '', `${url.pathname}${qs ? `?${qs}` : ''}${url.hash}`);
        }

        const code = url.searchParams.get('code');
        if (code) {
          logger.info('Auth: found code param, exchanging for session');
          const { data, error } = await supabase.auth.exchangeCodeForSession(url.href);
          if (error) {
            logger.error('exchangeCodeForSession error', { error });
            cleanupAuthUrl(url);
            if (isMounted) {
              setAuthError('Sign-in failed. The link may be invalid or expired — try again.');
            }
          } else if (isMounted) {
            logger.info('exchangeCodeForSession success', { userId: data.session?.user.id });
            setAuthError(null);
            setSession(data.session);
            setUser(data.session?.user ?? null);
            cleanupAuthUrl(url);
          }
          return;
        }

        const hash = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash;
        if (hash) {
          const hashParams = new URLSearchParams(hash);
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          const providerToken = hashParams.get('provider_token');
          const sbHashParam = hashParams.get('sb');
          const linkType = hashParams.get('type');
          logger.debug('Auth: hash fragment parsed', {
            hasAccessToken: !!accessToken,
            hasRefreshToken: !!refreshToken,
            hasProviderToken: !!providerToken,
            hasSbHashParam: !!sbHashParam,
            linkType,
          });

          if (accessToken && refreshToken) {
            if (linkType === 'recovery' && isMounted) {
              setPasswordRecoveryMode(true);
            }
            logger.info('Auth: found tokens in hash, calling setSession');
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (error) {
              logger.error('setSession error', { error });
              cleanupAuthUrl(url);
              if (isMounted) {
                setAuthError('Sign-in failed. The link may be invalid or expired — try again.');
              }
            } else if (isMounted) {
              logger.info('setSession success', { userId: data.session?.user.id });
              setAuthError(null);
              setSession(data.session);
              setUser(data.session?.user ?? null);
              cleanupAuthUrl(url);
            }
            return;
          }

          if (providerToken || sbHashParam) {
            // Supabase may redirect with provider-only hash params before session settles.
            // Clean URL immediately to avoid exposing long token fragments in the address bar.
            cleanupAuthUrl(url);
          }
        }

        const {
          data: { session: existing },
        } = await supabase.auth.getSession();
        logger.info('getSession result', { hasSession: !!existing, userId: existing?.user.id });
        if (isMounted) {
          if (existing) {
            setAuthError(null);
          } else if (!existing && referrer.includes('/auth/v1/verify')) {
            setAuthError('Sign-in failed. The link may be invalid or expired — try again.');
          } else if (oauthRedirectError) {
            setAuthError(oauthRedirectError);
          } else {
            setAuthError(null);
          }
          setSession(existing);
          setUser(existing?.user ?? null);
        }
      } catch (err) {
        logger.error('Auth init error', { err });
        if (isMounted) {
          setAuthError(null);
          setSession(null);
          setUser(null);
        }
      } finally {
        if (isMounted) {
          logger.debug('Auth init finished, set loading=false');
          setLoading(false);
        }
      }
    }

    void initAuth();

    return () => {
      logger.debug('AuthProvider unmount, unsubscribe');
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }, []);

  const signUpWithPassword = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}${AUTH_REDIRECT_PATH}`,
      },
    });
    return { error, session: data?.session ?? null };
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    const origin = window.location.origin;
    return supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${origin}${AUTH_REDIRECT_PATH}`,
    });
  }, []);

  const completePasswordRecovery = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (!error) {
      setPasswordRecoveryMode(false);
    }
    return { error };
  }, []);

  const signInWithGoogle = useCallback(async (options?: SignInWithGoogleOptions) => {
    const preserveGuestSession = options?.preserveGuestSession === true;
    const {
      data: { session: cur },
    } = await supabase.auth.getSession();
    const u = cur?.user ?? null;
    if (isAnonymousUser(u) && preserveGuestSession) {
      const { error } = await supabase.auth.linkIdentity({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}${AUTH_REDIRECT_PATH}`,
        },
      });
      const msg = (error?.message ?? '').toLowerCase();
      if (error && (msg.includes('identity_already_exists') || msg.includes('already linked'))) {
        const { error: oauthError } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}${AUTH_REDIRECT_PATH}`,
          },
        });
        return { error: oauthError };
      }
      return { error };
    }
    if (isAnonymousUser(u) && !preserveGuestSession) {
      await supabase.auth.signOut();
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}${AUTH_REDIRECT_PATH}`,
      },
    });
    return { error };
  }, []);

  const signOut = useCallback(async () => {
    invalidateGlcSessionDataCaches();
    clearPreviewSessionBackup();
    setPasswordRecoveryMode(false);
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      session,
      loading,
      authError,
      passwordRecoveryMode,
      signInWithPassword,
      signUpWithPassword,
      requestPasswordReset,
      completePasswordRecovery,
      signInWithGoogle,
      signOut,
      isAuthenticated: Boolean(user),
    }),
    [
      user,
      session,
      loading,
      authError,
      passwordRecoveryMode,
      signInWithPassword,
      signUpWithPassword,
      requestPasswordReset,
      completePasswordRecovery,
      signInWithGoogle,
      signOut,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx == null) {
    throw new Error('useAuth must be used within <AuthProvider>');
  }
  return ctx;
}
