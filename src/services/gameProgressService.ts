import { supabase } from '@/integrations/supabase/client';
import { GameProgressSchema, type GameProgress } from '@/types/gameProgress';
import { safeStorage } from '@/utils/safeStorage';

const TIMEOUT_MS = 3000;
const LOCAL_FALLBACK_KEY = 'game_progress_local';

async function withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), ms)
    )
  ]);
}

export const gameProgressService = {
  /**
   * Получить прогресс по миссии. Если не существует — создать.
   */
  async getOrCreate(userId: string, missionId: string): Promise<GameProgress> {
    try {
      // Пробуем получить из Supabase
      const { data, error } = await withTimeout(
        supabase
          .from('game_progress')
          .select('*')
          .eq('user_id', userId)
          .eq('mission_id', missionId)
          .maybeSingle(),
        TIMEOUT_MS
      );

      if (error) throw error;

      if (data) {
        return GameProgressSchema.parse(data);
      }

      // Создаём новую запись
      const newProgress: GameProgress = {
        user_id: userId,
        mission_id: missionId,
        current_room_index: 0,
        completed_rooms: [],
        session_xp: 0,
        total_xp_earned: 0,
        health: 100,
        has_key_card: false,
        flags: {},
        inventory: [],
        status: 'in_progress',
        attempts: 1,
        total_play_time_seconds: 0
      };

      const { data: created, error: createError } = await withTimeout(
        supabase
          .from('game_progress')
          .insert(newProgress)
          .select()
          .single(),
        TIMEOUT_MS
      );

      if (createError) throw createError;

      return GameProgressSchema.parse(created);
    } catch (e) {
      console.warn('[gameProgress] Supabase failed, using local:', e);

      // Fallback на localStorage
      const localKey = `${LOCAL_FALLBACK_KEY}_${missionId}`;
      const local = safeStorage.get(
        localKey,
        (raw) => GameProgressSchema.parse(raw),
        {
          user_id: userId,
          mission_id: missionId,
          current_room_index: 0,
          completed_rooms: [],
          session_xp: 0,
          total_xp_earned: 0,
          health: 100,
          has_key_card: false,
          flags: {},
          inventory: [],
          status: 'in_progress',
          attempts: 1,
          total_play_time_seconds: 0
        }
      );

      return local;
    }
  },

  /**
   * Обновить прогресс (автосейв)
   */
  async update(missionId: string, updates: Partial<GameProgress>): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await withTimeout(
        supabase
          .from('game_progress')
          .update(updates)
          .eq('user_id', user.id)
          .eq('mission_id', missionId),
        TIMEOUT_MS
      );

      if (error) throw error;
    } catch (e) {
      console.warn('[gameProgress] Update failed, saving locally:', e);

      // Также сохраняем локально
      const localKey = `${LOCAL_FALLBACK_KEY}_${missionId}`;
      const current = safeStorage.get<GameProgress>(localKey, (raw) => raw as GameProgress, null as any);
      if (current) {
        safeStorage.set(localKey, { ...current, ...updates });
      }
    }
  },

  /**
   * Завершить комнату
   */
  async completeRoom(missionId: string, roomIndex: number, xpEarned: number): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const current = await this.getOrCreate(user.id, missionId);

    const completedRooms = current.completed_rooms.includes(roomIndex)
      ? current.completed_rooms
      : [...current.completed_rooms, roomIndex];

    await this.update(missionId, {
      current_room_index: Math.max(current.current_room_index, roomIndex + 1),
      completed_rooms: completedRooms,
      session_xp: current.session_xp + xpEarned,
      total_xp_earned: current.total_xp_earned + xpEarned
    });
  },

  /**
   * Отметить миссию завершённой
   */
  async completeMission(missionId: string): Promise<void> {
    await this.update(missionId, {
      status: 'completed',
      completed_at: new Date().toISOString()
    });
  },

  /**
   * Сбросить прогресс
   */
  async reset(missionId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await withTimeout(
        supabase
          .from('game_progress')
          .delete()
          .eq('user_id', user.id)
          .eq('mission_id', missionId),
        TIMEOUT_MS
      );

      safeStorage.remove(`${LOCAL_FALLBACK_KEY}_${missionId}`);
    } catch (e) {
      console.error('[gameProgress] Reset failed:', e);
    }
  },

  /**
   * Получить все прогрессы пользователя
   */
  async getAllForUser(userId: string): Promise<GameProgress[]> {
    try {
      const { data, error } = await withTimeout(
        supabase
          .from('game_progress')
          .select('*')
          .eq('user_id', userId)
          .order('last_played_at', { ascending: false }),
        TIMEOUT_MS
      );

      if (error) throw error;
      return (data || []).map(d => GameProgressSchema.parse(d));
    } catch (e) {
      console.warn('[gameProgress] Get all failed:', e);
      return [];
    }
  }
};
