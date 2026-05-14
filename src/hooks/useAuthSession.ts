import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session, User } from '@supabase/supabase-js';

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  error: string | null;
  lastSyncAt: number | null;
}

const AUTH_TIMEOUT_MS = 5000;
const LAST_LOGIN_KEY = 'hs_last_login_timestamp';

export function useAuthSession() {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    loading: true,
    error: null,
    lastSyncAt: null
  });

  const updateLastLogin = useCallback(() => {
    localStorage.setItem(LAST_LOGIN_KEY, Date.now().toString());
  }, []);

  const isSessionExpired = useCallback((): boolean => {
    const lastLoginStr = localStorage.getItem(LAST_LOGIN_KEY);
    if (!lastLoginStr) return false; // Не считаем просроченной, если данных нет

    const lastLogin = parseInt(lastLoginStr, 10);
    const now = Date.now();
    const ageMs = now - lastLogin;
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

    return ageMs > TWENTY_FOUR_HOURS;
  }, []);

  useEffect(() => {
    let mounted = true;

    const timeoutId = setTimeout(() => {
      if (mounted && state.loading) {
        console.warn('[Auth] Timeout — proceeding without session');
        setState(prev => ({
          ...prev,
          loading: false,
          error: 'Auth timeout'
        }));
      }
    }, AUTH_TIMEOUT_MS);

    // Проверяем сессию
    const initAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (!mounted) return;

        // Если сессия есть и прошло >24 часов — принудительно выходим
        if (data.session && isSessionExpired()) {
          console.log('[Auth] Session expired (>24h), signing out');
          await supabase.auth.signOut();
          localStorage.removeItem(LAST_LOGIN_KEY);
          if (mounted) {
            clearTimeout(timeoutId);
            setState({
              session: null,
              user: null,
              loading: false,
              error: null,
              lastSyncAt: Date.now()
            });
          }
          return;
        }

        if (!mounted) return;
        clearTimeout(timeoutId);

        if (error) {
          console.error('[Auth] Get session error:', error);
          setState({
            session: null,
            user: null,
            loading: false,
            error: error.message,
            lastSyncAt: Date.now()
          });
          return;
        }

        if (data.session) {
          updateLastLogin();
        }

        setState({
          session: data.session,
          user: data.session?.user ?? null,
          loading: false,
          error: null,
          lastSyncAt: Date.now()
        });
      } catch (err: any) {
        if (!mounted) return;
        clearTimeout(timeoutId);
        console.error('[Auth] Init failed:', err);
        setState(prev => ({
          ...prev,
          loading: false,
          error: err.message || 'Unknown error'
        }));
      }
    };

    initAuth();

    // Подписка на изменения
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        if (!mounted) return;

        console.log('[Auth] Event:', event);

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          updateLastLogin();
        }

        if (event === 'SIGNED_OUT') {
          localStorage.removeItem(LAST_LOGIN_KEY);
        }

        setState({
          session: currentSession,
          user: currentSession?.user ?? null,
          loading: false,
          error: null,
          lastSyncAt: Date.now()
        });
      }
    );

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [isSessionExpired, updateLastLogin]);

  const signIn = useCallback(async (email: string, password: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      setState(prev => ({ ...prev, loading: false, error: error.message }));
      return { success: false, error: error.message };
    }

    updateLastLogin();
    setState({
      session: data.session,
      user: data.user,
      loading: false,
      error: null,
      lastSyncAt: Date.now()
    });

    return { success: true };
  }, [updateLastLogin]);

  const signUp = useCallback(async (email: string, password: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });

    if (error) {
      setState(prev => ({ ...prev, loading: false, error: error.message }));
      return { success: false, error: error.message };
    }

    updateLastLogin();
    setState({
      session: data.session,
      user: data.user,
      loading: false,
      error: null,
      lastSyncAt: Date.now()
    });

    return { success: true };
  }, [updateLastLogin]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    localStorage.removeItem(LAST_LOGIN_KEY);
    setState({
      session: null,
      user: null,
      loading: false,
      error: null,
      lastSyncAt: Date.now()
    });
  }, []);

  return {
    ...state,
    signIn,
    signUp,
    signOut,
    isAuthenticated: !!state.session
  };
}
