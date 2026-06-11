import { z } from 'zod';

// === PlayerProfile ===
export const PlayerProfileSchema = z.object({
  id: z.string(),
  username: z.string().min(1).max(50).default('Agent'),
  level: z.number().int().min(1).max(100).default(1),
  xp: z.number().int().min(0).max(10_000_000).default(0),
  xpToNext: z.number().int().min(0).default(1000),
  avatar: z.string().default('🦊'),
  rank: z.string().default('Стажёр'),
  missionsCompleted: z.number().int().min(0).default(0),
  streak: z.number().int().min(0).default(0),
  joinedDate: z.string().default(new Date().toISOString()),
  completedMissions: z.array(z.string()).max(1000).default([]),
  achievements: z.array(z.string()).max(500).default([]),
  inventory: z.array(z.object({
    id: z.string(),
    type: z.string(),
    quantity: z.number().int().min(0)
  })).max(100).default([]),
  streakDays: z.number().int().min(0).default(0),
  lastLoginDate: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});

export type PlayerProfile = z.infer<typeof PlayerProfileSchema>;

// === GameProgress ===
export const GameProgressSchema = z.object({
  currentRoomIndex: z.number().int().min(0).max(20).default(0),
  sessionXp: z.number().int().min(0).default(0),
  health: z.number().min(0).max(100).default(100),
  flags: z.record(z.string(), z.boolean()).default({}),
  hasKeyCard: z.boolean().default(false),
  completed: z.boolean().default(false)
});

export type GameProgress = z.infer<typeof GameProgressSchema>;

// === Preferences ===
export const PreferencesSchema = z.object({
  language: z.enum(['ru', 'en', 'kk']).default('ru'),
  soundEnabled: z.boolean().default(true),
  musicVolume: z.number().min(0).max(1).default(0.5),
  effectsVolume: z.number().min(0).max(1).default(0.7),
  graphicsQuality: z.enum(['low', 'medium', 'high']).default('medium'),
  controls: z.enum(['keyboard', 'touch', 'auto']).default('auto'),
  hapticEnabled: z.boolean().default(true)
});

export type Preferences = z.infer<typeof PreferencesSchema>;

// === Defaults ===
export const DEFAULT_PROFILE: PlayerProfile = {
  id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(7),
  xp: 0,
  level: 1,
  rank: 'Стажёр',
  completedMissions: [],
  achievements: [],
  inventory: [],
  streakDays: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

export const DEFAULT_PROGRESS: GameProgress = {
  currentRoomIndex: 0,
  sessionXp: 0,
  health: 100,
  flags: {},
  hasKeyCard: false
};

export const DEFAULT_PREFERENCES: Preferences = {
  language: 'ru',
  soundEnabled: true,
  musicVolume: 0.5,
  effectsVolume: 0.7,
  graphicsQuality: 'medium',
  controls: 'auto',
  hapticEnabled: true
};

// === Safe parsers ===
export function safeParseProfile(raw: unknown): PlayerProfile {
  const result = PlayerProfileSchema.safeParse(raw);
  if (!result.success) {
    console.warn('[Validator] Profile invalid, using default:', result.error.issues);
    return { ...DEFAULT_PROFILE, id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(7) };
  }
  return result.data;
}

export function safeParseProgress(raw: unknown): GameProgress {
  const result = GameProgressSchema.safeParse(raw);
  if (!result.success) {
    console.warn('[Validator] Progress invalid, using default');
    return DEFAULT_PROGRESS;
  }
  return result.data;
}

export function safeParsePreferences(raw: unknown): Preferences {
  const result = PreferencesSchema.safeParse(raw);
  if (!result.success) {
    console.warn('[Validator] Preferences invalid, using default');
    return DEFAULT_PREFERENCES;
  }
  return result.data;
}
