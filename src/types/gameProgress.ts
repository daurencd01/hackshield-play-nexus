import { z } from 'zod';

export const GameProgressSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid(),
  mission_id: z.string(),
  current_room_index: z.number().int().min(0).max(50),
  completed_rooms: z.array(z.number().int()).default([]),
  total_rooms: z.number().int().nullable().optional(),
  session_xp: z.number().int().min(0).default(0),
  total_xp_earned: z.number().int().min(0).default(0),
  health: z.number().int().min(0).max(100).default(100),
  has_key_card: z.boolean().default(false),
  flags: z.record(z.string(), z.boolean()).default({}),
  inventory: z.array(z.object({
    type: z.string(),
    quantity: z.number().int().min(0)
  })).default([]),
  status: z.enum(['in_progress', 'completed', 'failed', 'abandoned']).default('in_progress'),
  attempts: z.number().int().min(1).default(1),
  total_play_time_seconds: z.number().int().min(0).default(0),
  started_at: z.string().optional(),
  last_played_at: z.string().optional(),
  completed_at: z.string().nullable().optional()
});

export type GameProgress = z.infer<typeof GameProgressSchema>;
