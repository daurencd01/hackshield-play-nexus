import { z } from 'zod';

export const ScenarioProgressSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid(),
  mission_id: z.string(),
  scenario_id: z.string(),
  current_step_id: z.string().nullable().optional(),
  completed_steps: z.array(z.string()).default([]),
  history: z.array(z.string()).default([]),
  total_xp: z.number().int().min(0).default(0),
  hints_used: z.number().int().min(0).default(0),
  flags: z.record(z.string(), z.boolean()).default({}),
  answers: z.record(z.string(), z.unknown()).default({}),
  status: z.enum(['in_progress', 'completed', 'failed']).default('in_progress'),
  attempts: z.number().int().min(1).default(1),
  started_at: z.string().optional(),
  last_played_at: z.string().optional(),
  completed_at: z.string().nullable().optional()
});

export type ScenarioProgress = z.infer<typeof ScenarioProgressSchema>;
