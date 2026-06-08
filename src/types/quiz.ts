import { z } from 'zod';

export const QuizQuestionSchema = z.object({
  id: z.string().uuid(),
  room_id: z.number().int(),
  category: z.string(),
  difficulty: z.enum(['easy', 'medium', 'hard', 'expert']),
  question_text: z.string(),
  options: z.array(z.string()),
  correct_answer: z.number().int(),
  explanation: z.string().nullable().optional(),
  xp_reward: z.number().int().default(10),
  time_limit_seconds: z.number().int().default(30),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;

// Legacy support for other parts of the app if needed
export const QuizSchema = QuizQuestionSchema;
export type Quiz = QuizQuestion;
