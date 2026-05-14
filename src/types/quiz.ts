import { z } from 'zod';

export const QuizOptionSchema = z.object({
  id: z.string().uuid(),
  quiz_id: z.string(),
  text_ru: z.string(),
  text_en: z.string().nullable().optional(),
  text_kk: z.string().nullable().optional(),
  is_correct: z.boolean(),
  explanation_ru: z.string().nullable().optional(),
  explanation_en: z.string().nullable().optional(),
  explanation_kk: z.string().nullable().optional(),
  order_index: z.number().int().default(0)
});

export const QuizSchema = z.object({
  id: z.string(),
  category_id: z.string().nullable(),
  type: z.enum(['multiple_choice', 'text_input', 'binary', 'sequence', 'code_input']),
  difficulty: z.number().int().min(1).max(5),

  title_ru: z.string(),
  title_en: z.string().nullable().optional(),
  title_kk: z.string().nullable().optional(),
  description_ru: z.string(),
  description_en: z.string().nullable().optional(),
  description_kk: z.string().nullable().optional(),
  hint_ru: z.string().nullable().optional(),
  hint_en: z.string().nullable().optional(),
  hint_kk: z.string().nullable().optional(),

  correct_answer: z.string().nullable().optional(),
  accept_variants: z.array(z.string()).default([]),
  case_sensitive: z.boolean().default(false),
  correct_choice: z.string().nullable().optional(),
  correct_sequence: z.array(z.string()).default([]),

  time_limit_seconds: z.number().int().nullable().optional(),
  xp_reward: z.number().int().min(0),
  penalty_on_fail: z.number().int().min(0).default(0),

  tags: z.array(z.string()).default([]),

  options: z.array(QuizOptionSchema).default([])
});

export type Quiz = z.infer<typeof QuizSchema>;
export type QuizOption = z.infer<typeof QuizOptionSchema>;
