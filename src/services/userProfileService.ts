import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import { createLogger } from '@/utils/logger';

const log = createLogger('UserProfile');

export const PublicProfileSchema = z.object({
  id: z.string().uuid(),
  username: z.string(),
  avatar_url: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  social_links: z.record(z.unknown()).nullable().optional(),
  is_online: z.preprocess((val) => val ?? false, z.boolean()),
  last_seen_at: z.string().nullable().optional(),
  joined_at: z.string().nullable().optional(),
  xp: z.preprocess((val) => val ?? 0, z.number()),
  level: z.preprocess((val) => val ?? 1, z.number()),
  achievements_count: z.number().int(),
  global_rank: z.number().int(),
});

export type PublicProfile = z.infer<typeof PublicProfileSchema>;

export const UserAchievementSchema = z.object({
  user_id: z.string().uuid(),
  achievement_id: z.string(),
  unlocked_at: z.string(),
  title_ru: z.string(),
  title_en: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  rarity: z.string().nullable().optional(),
  recent_order: z.number().int()
});

export type UserAchievement = z.infer<typeof UserAchievementSchema>;

export const RecentMissionSchema = z.object({
  user_id: z.string().uuid(),
  mission_id: z.string(),
  completed_at: z.string(),
  title_ru: z.string(),
  title_en: z.string().nullable().optional(),
  difficulty: z.number().int(),
  category: z.string().nullable().optional(),
  xp_reward: z.number().int(),
  recent_order: z.number().int()
});

export type RecentMission = z.infer<typeof RecentMissionSchema>;

export const userProfileService = {
  async getPublicProfile(idOrUsername: string): Promise<PublicProfile | null> {
    try {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrUsername);

      const query = supabase
        .from('user_public_profiles')
        .select('*');

      const { data, error } = await (isUUID
        ? query.eq('id', idOrUsername).single()
        : query.eq('username', idOrUsername).single());

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return PublicProfileSchema.parse(data);
    } catch (e) {
      log.error('Failed to get public profile:', e);
      return null;
    }
  },

  async getUserAchievements(userId: string, limit = 10): Promise<UserAchievement[]> {
    try {
      const { data, error } = await supabase
        .from('user_top_achievements' as any)
        .select('*')
        .eq('user_id', userId)
        .lte('recent_order', limit);

      if (error) throw error;
      return (data || []).map(d => UserAchievementSchema.parse(d));
    } catch (e) {
      log.error('Failed to get achievements:', e);
      return [];
    }
  },

  async getRecentMissions(userId: string, limit = 5): Promise<RecentMission[]> {
    try {
      const { data, error } = await supabase
        .from('user_recent_missions' as any)
        .select('*')
        .eq('user_id', userId)
        .lte('recent_order', limit);

      if (error) throw error;
      return (data || []).map(d => RecentMissionSchema.parse(d));
    } catch (e) {
      log.error('Failed to get recent missions:', e);
      return [];
    }
  }
};
