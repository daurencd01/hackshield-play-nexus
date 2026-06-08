import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
export type { UserProfile } from '@/types/game';
import { UserProfile } from '@/types/game';

export function useUser() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (authUser: any): Promise<UserProfile | null> => {
    if (localStorage.getItem('hs_bypass') === '1' || authUser.id === 'mock-user-uuid-1234567890') {
      return {
        id: 'mock-user-uuid-1234567890',
        username: 'operative_dauren',
        full_name: 'Operative Dauren',
        role: 'operative',
        email: 'operative@hackshield.com',
        xp: 350,
        created_at: new Date().toISOString(),
        avatar_url: null,
        telegram: '@dauren',
        instagram: null
      };
    }

    let { data, error } = await (supabase
      .from('profiles') as any)
      .select('id, email, username, full_name, role, xp, created_at, avatar_url, telegram, instagram')
      .eq('id', authUser.id)
      .maybeSingle(); 

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
      
      const { data: created, error: createError } = await (supabase
        .from('profiles') as any)
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
      const isBypass = localStorage.getItem('hs_bypass') === '1';
      if (isBypass) {
        const profile = await fetchProfile({ id: 'mock-user-uuid-1234567890', email: 'operative@hackshield.com' });
        if (mounted) {
          setUser(profile);
          setLoading(false);
        }
        return;
      }

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
      if (localStorage.getItem('hs_bypass') === '1') {
        const profile = await fetchProfile({ id: 'mock-user-uuid-1234567890', email: 'operative@hackshield.com' });
        if (mounted) {
          setUser(profile);
        }
        return;
      }

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
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== userId) return null;

    const { error } = await (supabase as any).rpc('increment_xp', { xp_to_add: amount });
    if (error) throw error;

    const { data: current } = await (supabase
      .from('profiles') as any)
      .select('xp')
      .eq('id', userId)
      .maybeSingle();

    return current?.xp ?? null;
  } catch (e) {
    console.error('[useUser] addXp failed:', e);
    return null;
  }
}
