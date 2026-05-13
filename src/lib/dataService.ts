import { Player, currentPlayer, leaderboard, achievements, Achievement } from "@/data/mockData";
import { safeStorage } from "@/utils/safeStorage";
import { safeParseProfile, safeParseProgress, PlayerProfile } from "@/utils/validators";

export const dataService = {
  getUser: async () => {
    // Mock user login checking using safeStorage
    const mockUser = safeStorage.get("mock_user", (raw) => raw, null);
    if (mockUser) {
      return { user: mockUser };
    }
    // Simulate auto-login for testing purposes
    const defaultUser = { id: currentPlayer.id, email: "agent@hackshield.io", user_metadata: { full_name: currentPlayer.username } };
    safeStorage.set("mock_user", defaultUser);
    return { user: defaultUser };
  },

  signIn: async (email: string) => {
    const user = { id: "player-1", email, user_metadata: { full_name: "ShadowByte" } };
    safeStorage.set("mock_user", user);
    return { user };
  },

  signOut: async () => {
    safeStorage.remove("mock_user");
    return { error: null };
  },

  getPlayerProfile: async (): Promise<Player> => {
    const profile = safeStorage.get<PlayerProfile>("player_profile", safeParseProfile, { ...currentPlayer, completedMissions: [], achievements: [], inventory: [], streakDays: 0 });
    // Map internal profile back to Player interface if needed, but they are aligned now
    return profile as unknown as Player;
  },

  getLeaderboard: async () => {
    return leaderboard;
  },

  getAchievements: async (): Promise<Achievement[]> => {
    return achievements;
  },

  addXp: async (xp: number) => {
    const currentXp = safeStorage.get("mock_xp", (raw) => Number(raw), 0);
    const newXp = currentXp + xp;
    safeStorage.set("mock_xp", newXp);
    return newXp;
  },

  getTotalXp: () => {
    return safeStorage.get("mock_xp", (raw) => Number(raw), 0);
  },

  getScenarioRooms: async (missionId: string) => {
    const { mockScenarioRooms } = await import("@/data/mockData");
    return mockScenarioRooms.filter(r => r.mission_id === missionId || r.mission_id === "m1"); // fallback to m1 for now
  },

  getUserProgress: async (userId: string, missionId: string) => {
    const key = `prog_${userId}_${missionId}`;
    return safeStorage.get(key, safeParseProgress, null);
  },

  saveUserProgress: async (userId: string, missionId: string, currentRoom: number, completed: boolean) => {
    const key = `prog_${userId}_${missionId}`;
    safeStorage.set(key, { currentRoomIndex: currentRoom, completed });
  }
};
