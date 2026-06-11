import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session, User } from '@supabase/supabase-js';

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  error: string | null;
}

export function useAuthSession() {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!mounted) return;
      setState({
        session,
        user: session?.user ?? null,
        loading: false,
        error: error?.message ?? null,
      });
    });

    // 2. Listen to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setState(prev => ({
        ...prev,
        session,
        user: session?.user ?? null,
        loading: false,
        error: null,
      }));
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []); // Empty deps — runs once on mount

  // ── Sign In ─────────────────────────────────────────────────
  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false as const, error: error.message };
    return { success: true as const, session: data.session, user: data.user };
  }, []);

  // ── Sign Up ─────────────────────────────────────────────────
  const signUp = useCallback(async (
    email: string,
    password: string,
    username: string,
    fullName: string,
  ) => {
    // Check username uniqueness before creating account
    const { data: existing } = await (supabase.from('profiles') as any)
      .select('id')
      .eq('username', username.trim())
      .maybeSingle();

    if (existing) {
      return { success: false as const, error: 'Этот никнейм уже занят. Выберите другой.' };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Passed to handle_new_user trigger → written to profiles
        data: {
          username: username.trim(),
          full_name: fullName.trim(),
        },
        emailRedirectTo: `${window.location.origin}/auth`,
      },
    });

    if (error) return { success: false as const, error: error.message };

    // Session is null when email confirmation is required
    const needsConfirmation = !data.session;
    return { success: true as const, needsConfirmation, user: data.user };
  }, []);

  // ── Verify OTP ───────────────────────────────────────────────
  const verifyOtp = useCallback(async (email: string, token: string) => {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'signup',
    });
    if (error) return { success: false as const, error: error.message };
    return { success: true as const, session: data.session, user: data.user };
  }, []);

  // ── Sign Out ─────────────────────────────────────────────────
  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return {
    ...state,
    isAuthenticated: !!state.session,
    signIn,
    signUp,
    verifyOtp,
    signOut,
  };
}
