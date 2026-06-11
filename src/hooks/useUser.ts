import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
export type { UserProfile } from '@/types/game';
import { UserProfile } from '@/types/game';

const PROFILE_COLS = 'id, email, username, full_name, role, xp, created_at, avatar_url, telegram, instagram';

async function fetchProfile(authUser: any): Promise<UserProfile | null> {
  if (!authUser) return null;

  let { data, error } = await (supabase
    .from('profiles') as any)
    .select(PROFILE_COLS)
    .eq('id', authUser.id)
    .maybeSingle();

  if (error) {
    console.warn('[useUser] Profile fetch error:', error.message);
    return null;
  }

  // Auto-create a profile row if onboarding never completed.
  if (!data) {
    const newProfile = {
      id: authUser.id,
      username: authUser.email?.split('@')[0] || 'user',
      full_name: '',
      role: 'student',
      email: authUser.email,
      updated_at: new Date().toISOString(),
    };
    const { data: created, error: createError } = await (supabase
      .from('profiles') as any)
      .upsert(newProfile)
      .select(PROFILE_COLS)
      .single();
    if (createError) {
      console.error('[useUser] Failed to auto-create profile:', createError.message);
      return null;
    }
    data = created;
  }

  return data as UserProfile | null;
}

/**
 * Cached, deduplicated current-user profile.
 * Reuses the global auth session (AuthContext) instead of re-checking the session
 * and re-verifying the JWT on every component mount, and caches the profile via
 * React Query so navigating between pages is instant.
 */
export function useUser() {
  const { user: authUser, loading: authLoading } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['profile', authUser?.id ?? 'anon'],
    queryFn: () => fetchProfile(authUser),
    enabled: !authLoading && !!authUser,
    staleTime: 5 * 60 * 1000,   // treat profile as fresh for 5 min
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  return {
    user: authUser ? (data ?? null) : null,
    loading: authLoading || (!!authUser && isLoading),
  };
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
