import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

export const LeaderboardEntrySchema = z.object({
  id: z.string().uuid(),
  username: z.string().nullable().transform(val => val || "Аноним"),
  avatar_url: z.string().nullable().optional(),
  xp: z.preprocess((val) => val ?? 0, z.number().int()).default(0),
  level: z.preprocess((val) => val ?? 1, z.number().int()).default(1),
  is_online: z.preprocess((val) => val ?? false, z.boolean()).default(false),
  last_seen_at: z.string().nullable().optional(),
  completed_missions: z.preprocess((val) => val ?? 0, z.number().int()).default(0),
  global_rank: z.preprocess((val) => val ?? 0, z.number().int()).default(0)
});


export type LeaderboardEntry = z.infer<typeof LeaderboardEntrySchema>;

const TIMEOUT_MS = 5000;

async function withTimeout<T>(p: PromiseLike<T>, ms: number): Promise<T> {
  return Promise.race([
    Promise.resolve(p),
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms))
  ]);
}

export const leaderboardService = {
  async getTop(limit = 100): Promise<LeaderboardEntry[]> {
    try {
      const { data, error } = await withTimeout(
        supabase
          .from('leaderboard_live')
          .select('*')
          .order('global_rank', { ascending: true })
          .limit(limit),
        TIMEOUT_MS
      );

      if (error) throw error;
      return (data || []).map(d => LeaderboardEntrySchema.parse(d));
    } catch (e) {
      console.error('[Leaderboard] Failed:', e);
      return [];
    }
  },

  async getMyRank(userId: string): Promise<LeaderboardEntry | null> {
    try {
      const { data, error } = await withTimeout(
        supabase
          .from('leaderboard_live')
          .select('*')
          .eq('id', userId)
          .maybeSingle(),
        TIMEOUT_MS
      );

      if (error) throw error;
      return data ? LeaderboardEntrySchema.parse(data) : null;
    } catch (e) {
      console.warn('[Leaderboard] My rank failed:', e);
      return null;
    }
  },

  async searchUsers(query: string, limit = 20): Promise<LeaderboardEntry[]> {
    if (query.trim().length < 2) return [];

    try {
      const { data, error } = await withTimeout(
        supabase
          .from('leaderboard_live')
          .select('*')
          .ilike('username', `%${query}%`)
          .limit(limit),
        TIMEOUT_MS
      );

      if (error) throw error;
      return (data || []).map(d => LeaderboardEntrySchema.parse(d));
    } catch (e) {
      console.error('[Leaderboard] Search failed:', e);
      return [];
    }
  },

  subscribeToTopChanges(callback: (entries: LeaderboardEntry[]) => void) {
    const channel = supabase
      .channel('leaderboard_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        async () => {
          const top = await this.getTop(10);
          callback(top);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
};
