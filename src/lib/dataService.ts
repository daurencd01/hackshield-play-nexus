import { Player, currentPlayer, leaderboard, achievements, Achievement } from "@/data/mockData";

export const dataService = {
  getUser: async () => {
    // Mock user login checking
    const mockUser = localStorage.getItem("mock_user");
    if (mockUser) {
      return { user: JSON.parse(mockUser) };
    }
    // Simulate auto-login for testing purposes
    const defaultUser = { id: currentPlayer.id, email: "agent@hackshield.io", user_metadata: { full_name: currentPlayer.username } };
    localStorage.setItem("mock_user", JSON.stringify(defaultUser));
    return { user: defaultUser };
  },

  signIn: async (email: string) => {
    const user = { id: "player-1", email, user_metadata: { full_name: "ShadowByte" } };
    localStorage.setItem("mock_user", JSON.stringify(user));
    return { user };
  },

  signOut: async () => {
    localStorage.removeItem("mock_user");
    return { error: null };
  },

  getPlayerProfile: async (): Promise<Player> => {
    return currentPlayer;
  },

  getLeaderboard: async () => {
    return leaderboard;
  },

  getAchievements: async (): Promise<Achievement[]> => {
    return achievements;
  },

  addXp: async (xp: number) => {
    const xpStr = localStorage.getItem("mock_xp") || "0";
    const currentXp = parseInt(xpStr, 10);
    localStorage.setItem("mock_xp", (currentXp + xp).toString());
    return currentXp + xp;
  },

  getTotalXp: () => {
    return parseInt(localStorage.getItem("mock_xp") || "0", 10);
  },

  getScenarioRooms: async (missionId: string) => {
    const { mockScenarioRooms } = await import("@/data/mockData");
    return mockScenarioRooms.filter(r => r.mission_id === missionId || r.mission_id === "m1"); // fallback to m1 for now
  },

  getUserProgress: async (userId: string, missionId: string) => {
    const prog = localStorage.getItem(`prog_${userId}_${missionId}`);
    return prog ? JSON.parse(prog) : null;
  },

  saveUserProgress: async (userId: string, missionId: string, currentRoom: number, completed: boolean) => {
    localStorage.setItem(`prog_${userId}_${missionId}`, JSON.stringify({ current_room: currentRoom, completed }));
  }
};
