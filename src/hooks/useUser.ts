import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface UserProfile {
  id: string;
  email: string | null;
  xp: number;
  username: string | null;
  full_name: string | null;
  role: string | null;
  created_at: string | null;
  avatar_url: string | null;
  telegram: string | null;
  instagram: string | null;
}

export function useUser() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (authUser: any): Promise<UserProfile | null> => {
    let { data, error } = await supabase
      .from('profiles')
      .select('id, email, username, full_name, role, xp, created_at, avatar_url, telegram, instagram')
      .eq('id', authUser.id)
      .maybeSingle(); // safe: returns null instead of 406 when no row exists

    if (error) {
      console.warn('[useUser] Profile fetch error:', error.message);
      return null;
    }

    if (!data) {
      console.log('[useUser] Profile missing, creating new one for:', authUser.id);
      const newProfile = {
        id: authUser.id,
        username: authUser.email?.split('@')[0] || 'user',
        full_name: '',
        role: 'student',
        email: authUser.email,
        updated_at: new Date().toISOString()
      };
      
      const { data: created, error: createError } = await supabase
        .from('profiles')
        .upsert(newProfile)
        .select('id, email, username, full_name, role, xp, created_at, avatar_url, telegram, instagram')
        .single();
        
      if (createError) {
        console.error('[useUser] Failed to auto-create profile:', createError.message);
        return null;
      }
      data = created;
    }

    return data as UserProfile | null;
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      // Step 1: Check session
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        if (mounted) setLoading(false);
        return;
      }

      // Step 2: Server-side verify (prevents stale JWT attacks)
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser) {
        if (mounted) setLoading(false);
        return;
      }

      // Step 3: Fetch profile — may be null if onboarding not complete
      const profile = await fetchProfile(authUser);
      if (mounted) {
        setUser(profile);
        setLoading(false);
      }
    };

    init();

    // Keep in sync with auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        if (mounted) {
          setUser(null);
          setLoading(false);
        }
        return;
      }

      if (event === 'SIGNED_IN' && session?.user) {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser && mounted) {
          const profile = await fetchProfile(authUser);
          setUser(profile);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}

export async function addXp(userId: string, amount: number): Promise<number | null> {
  // Verify session and ownership before any DB write
  const { data: { session } } = await supabase.auth.getSession();
  if (!session || session.user.id !== userId) {
    return null;
  }

  const { data: current } = await supabase
    .from('profiles')
    .select('xp')
    .eq('id', userId)
    .maybeSingle();

  if (!current) return null;

  const newXp = (current.xp || 0) + amount;

  const { data: updated } = await supabase
    .from('profiles')
    .update({ xp: newXp })
    .eq('id', userId)
    .select('xp')
    .maybeSingle();

  return updated?.xp ?? null;
}
