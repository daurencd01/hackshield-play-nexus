import { supabase } from "@/lib/supabase";
import { safeStorage } from "@/utils/safeStorage";
import { safeParseProfile, safeParseProgress, PlayerProfile } from "@/utils/validators";
import { Player, currentPlayer, leaderboard, achievements, Achievement } from "@/data/defaultData";

const SUPABASE_TIMEOUT = 3000;

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<T>((_, reject) =>
    setTimeout(() => reject(new Error('Supabase timeout')), ms)
  );
  return Promise.race([promise, timeout]);
}

export const dataService = {
  getUser: async () => {
    try {
      const response = await withTimeout(
        supabase.auth.getUser(),
        SUPABASE_TIMEOUT
      );
      const { data: { user }, error } = response as any;
      if (error) throw error;
      return { user };
    } catch (e) {
      console.warn('[dataService] Supabase getUser failed, using fallback:', e);
      const mockUser = safeStorage.get("mock_user", (raw) => raw, null);
      if (mockUser) return { user: mockUser };
      
      const defaultUser = { 
        id: currentPlayer.id, 
        email: "agent@hackshield.io", 
        user_metadata: { full_name: currentPlayer.username } 
      };
      safeStorage.set("mock_user", defaultUser);
      return { user: defaultUser };
    }
  },

  signIn: async (email: string) => {
    try {
      const response = await withTimeout(
        supabase.auth.signInWithOtp({ email }),
        SUPABASE_TIMEOUT
      );
      const { data, error } = response as any;
      if (error) throw error;
      return data;
    } catch (e) {
      console.warn('[dataService] Supabase signIn failed, using mock:', e);
      const user = { id: "player-1", email, user_metadata: { full_name: "ShadowByte" } };
      safeStorage.set("mock_user", user);
      return { user };
    }
  },

  signOut: async () => {
    try {
      await withTimeout(supabase.auth.signOut(), SUPABASE_TIMEOUT);
    } catch (e) {
      console.warn('[dataService] Supabase signOut failed:', e);
    }
    safeStorage.remove("mock_user");
    return { error: null };
  },

  getPlayerProfile: async (): Promise<Player> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const response = await withTimeout(
          supabase.from('profiles').select('*').eq('id', user.id).single() as any,
          SUPABASE_TIMEOUT
        );
        const { data, error } = response as any;
        if (!error && data) return data as unknown as Player;
      }
    } catch (e) {
      console.warn('[dataService] Supabase getPlayerProfile failed, using fallback:', e);
    }
    
    const profile = safeStorage.get<PlayerProfile>("player_profile", safeParseProfile, { 
      ...currentPlayer, 
      completedMissions: [], 
      achievements: [], 
      inventory: [], 
      streakDays: 0 
    });
    return profile as unknown as Player;
  },

  getLeaderboard: async () => {
    try {
      const response = await withTimeout(
        supabase.from('profiles').select('username, xp, avatar_url').order('xp', { ascending: false }).limit(10) as any,
        SUPABASE_TIMEOUT
      );
      const { data, error } = response as any;
      if (!error && data) return data;
    } catch (e) {
      console.warn('[dataService] Supabase getLeaderboard failed, using mock:', e);
    }
    return leaderboard;
  },

  getAchievements: async (): Promise<Achievement[]> => {
    return achievements;
  },

  addXp: async (xp: number) => {
    const currentXp = safeStorage.get("mock_xp", (raw) => Number(raw), 0);
    const newXp = currentXp + xp;
    safeStorage.set("mock_xp", newXp);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await withTimeout(
          (supabase as any).rpc('increment_xp', { xp_to_add: xp }),
          SUPABASE_TIMEOUT
        );
      }
    } catch (e) {
      console.warn('[dataService] Supabase addXp failed:', e);
    }
    
    return newXp;
  },

  getTotalXp: () => {
    return safeStorage.get("mock_xp", (raw) => Number(raw), 0);
  },

  getScenarioRooms: async (missionId: string) => {
    const { mockScenarioRooms } = await import("@/data/defaultData");
    return mockScenarioRooms.filter(r => r.mission_id === missionId || r.mission_id === "m1");
  },

  getUserProgress: async (userId: string, missionId: string) => {
    try {
      const response = await withTimeout(
        supabase.from('user_progress').select('*').eq('user_id', userId).eq('mission_id', missionId).single() as any,
        SUPABASE_TIMEOUT
      );
      const { data, error } = response as any;
      if (!error && data) return data;
    } catch (e) {
      console.warn('[dataService] Supabase getUserProgress failed, using fallback:', e);
    }
    const key = `prog_${userId}_${missionId}`;
    return safeStorage.get(key, safeParseProgress, null);
  },

  saveUserProgress: async (userId: string, missionId: string, currentRoom: number, completed: boolean) => {
    const key = `prog_${userId}_${missionId}`;
    safeStorage.set(key, { currentRoomIndex: currentRoom, completed });
    
    try {
      await withTimeout(
        supabase.from('user_progress').upsert({
          user_id: userId,
          mission_id: missionId,
          current_room_index: currentRoom,
          completed,
          updated_at: new Date().toISOString()
        } as any) as any,
        SUPABASE_TIMEOUT
      );
    } catch (e) {
      console.warn('[dataService] Supabase saveUserProgress failed:', e);
    }
  }
};
