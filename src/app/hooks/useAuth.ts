import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import type { User, Session } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
   const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    logger.debug('useAuth mounted');
    let isMounted = true;

    async function initAuth() {
      logger.info('Auth init start');
      try {
        const href = window.location.href;
        const referrer = document.referrer;
        logger.debug('Auth current URL', { href });
        logger.debug('Auth document.referrer', { referrer });

        const url = new URL(href);
        const fromMagic = url.searchParams.get('from_magic') === '1'
          || referrer.includes('/auth/v1/verify');

        // OAuth / magic-link failures: ?error= & error_description= (e.g. DB error saving new user)
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

        // 1) Новый PKCE-флоу: ?code=...
        const code = url.searchParams.get('code');
        if (code) {
          logger.info('Auth: found code param, exchanging for session');
          const { data, error } = await supabase.auth.exchangeCodeForSession(url.href);
          if (error) {
            logger.error('exchangeCodeForSession error', { error });
            if (isMounted) {
              setAuthError('Magic link is invalid or has expired. Please request a new one.');
            }
          } else if (isMounted) {
            logger.info('exchangeCodeForSession success', { userId: data.session?.user.id });
            setAuthError(null);
            setSession(data.session);
            setUser(data.session?.user ?? null);
          }
          return;
        }

        // 2) Старый implicit-флоу: #access_token=...&refresh_token=...
        const hash = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash;
        if (hash) {
          const hashParams = new URLSearchParams(hash);
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          logger.debug('Auth: hash fragment parsed', {
            hasAccessToken: !!accessToken,
            hasRefreshToken: !!refreshToken,
          });

          if (accessToken && refreshToken) {
            logger.info('Auth: found tokens in hash, calling setSession');
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (error) {
              logger.error('setSession error', { error });
              if (isMounted) {
                setAuthError('Magic link is invalid or has expired. Please request a new one.');
              }
            } else if (isMounted) {
              logger.info('setSession success', { userId: data.session?.user.id });
              setAuthError(null);
              setSession(data.session);
              setUser(data.session?.user ?? null);
            }
            return;
          }
        }

        // 3) Обычная инициализация — пробуем достать уже сохранённую сессию
        const { data: { session } } = await supabase.auth.getSession();
        logger.info('getSession result', { hasSession: !!session, userId: session?.user.id });
        if (isMounted) {
          if (session) {
            setAuthError(null);
          } else if (fromMagic) {
            setAuthError('Magic link is invalid or has expired. Please request a new one.');
          } else if (oauthRedirectError) {
            setAuthError(oauthRedirectError);
          } else {
            setAuthError(null);
          }
          setSession(session);
          setUser(session?.user ?? null);
        }
      } finally {
        if (isMounted) {
          logger.debug('Auth init finished, set loading=false');
          setLoading(false);
        }
      }
    }

    initAuth();

    // Слушаем дальнейшие изменения (signOut, обновление токена и т.п.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      logger.info('onAuthStateChange', { hasSession: !!session, userId: session?.user.id });
      if (!isMounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      logger.debug('useAuth unmount, unsubscribe');
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithEmail = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/login?from_magic=1`,
      },
    });
    return { error };
  };

  const signInWithPassword = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // Must not be bare origin: `/` immediately redirects to `/dashboard` and drops ?code / hash tokens.
        redirectTo: `${window.location.origin}/login`,
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  return {
    user,
    session,
    loading,
    authError,
    signInWithEmail,
    signInWithPassword,
    signInWithGoogle,
    signOut,
    isAuthenticated: !!user,
  };
}
