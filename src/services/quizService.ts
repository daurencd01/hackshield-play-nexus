import { supabase } from '@/integrations/supabase/client';
import { createLogger } from '@/utils/logger';

const log = createLogger('Quiz');

export interface QuizQuestion {
  id: string;
  room_id: number;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  question_text: string;
  options: string[];
  correct_answer: number;
  explanation: string;
  xp_reward: number;
  time_limit_seconds: number;
  hint?: string;
  source?: string;
}

export interface QuizAnswer {
  success: boolean;
  is_correct?: boolean;
  correct_answer?: number;
  xp_earned?: number;
  explanation?: string;
  message: string;
}

export interface QuizStats {
  total_answered: number;
  correct_answers: number;
  accuracy_percent: number;
  total_xp: number;
  avg_time: number;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const quizCache: Record<number, { data: QuizQuestion[], timestamp: number }> = {};

export const quizService = {
  /**
   * Fetch quizzes for a specific room with TTL cache
   */
  async fetchQuizzesByRoom(roomId: number): Promise<QuizQuestion[]> {
    const now = Date.now();
    if (quizCache[roomId] && (now - quizCache[roomId].timestamp < CACHE_TTL)) {
      log.info(`[Quiz] Loaded room ${roomId} from cache`);
      return quizCache[roomId].data;
    }

    try {
      log.info(`[Quiz] Fetching questions for room ${roomId}...`);
      const { data, error } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('room_id', roomId);

      if (error) throw error;

      const questions = data as QuizQuestion[];
      quizCache[roomId] = { data: questions, timestamp: now };
      
      log.info(`[Quiz] Successfully loaded ${questions.length} questions for room ${roomId}`);
      return questions;
    } catch (e) {
      log.error(`[Quiz] Failed to fetch quizzes for room ${roomId}:`, e);
      return [];
    }
  },

  /**
   * Fetch quizzes by filter (difficulty, category)
   */
  async getByFilter(options: { difficulty?: string | number; category?: string }): Promise<QuizQuestion[]> {
    try {
      let query = supabase.from('quiz_questions').select('*');
      if (options.category) {
        query = query.eq('category', options.category);
      }
      if (options.difficulty !== undefined) {
        const diffMap: Record<number, 'easy' | 'medium' | 'hard' | 'expert'> = {
          0: 'easy',
          1: 'medium',
          2: 'hard',
          3: 'expert'
        };
        const diffStr = typeof options.difficulty === 'number' 
          ? (diffMap[options.difficulty] || 'easy')
          : options.difficulty;
        query = query.eq('difficulty', diffStr);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as QuizQuestion[];
    } catch (e) {
      log.error('[Quiz] Failed to fetch quizzes by filter:', e);
      return [];
    }
  },

  /**
   * Fetch quizzes that the user hasn't answered yet in this room
   */
  async fetchUnansweredQuizzes(roomId: number, userId: string): Promise<QuizQuestion[]> {
    try {
      log.info(`[Quiz] Fetching unanswered questions for user ${userId} in room ${roomId}...`);
      
      // 1. Get all questions for room
      const allQuestions = await this.fetchQuizzesByRoom(roomId);
      
      // 2. Get answered IDs from user_progress
      const { data: answered, error } = await supabase
        .from('user_progress')
        .select('quiz_question_id')
        .eq('user_id', userId)
        .eq('room_id', roomId);

      if (error) throw error;

      const answeredIds = new Set((answered || []).map(a => a.quiz_question_id));
      const unanswered = allQuestions.filter(q => !answeredIds.has(q.id));

      log.info(`[Quiz] Found ${unanswered.length} unanswered questions out of ${allQuestions.length}`);
      return unanswered;
    } catch (e) {
      log.error('[Quiz] Failed to fetch unanswered quizzes:', e);
      return [];
    }
  },

  /**
   * Submit quiz answer via RPC
   */
  async submitQuizAnswer(
    userId: string, 
    questionId: string, 
    roomId: number, 
    selectedAnswer: number, 
    timeSpent: number
  ): Promise<QuizAnswer> {
    try {
      log.info(`[Quiz] Submitting answer for Q:${questionId} by U:${userId}...`);
      
      const { data, error } = await supabase.rpc('submit_quiz_answer', {
        p_user_id: userId,
        p_quiz_question_id: questionId,
        p_room_id: roomId,
        p_selected_answer: selectedAnswer,
        p_time_spent: timeSpent
      });

      if (error) throw error;

      log.info(`[Quiz] Submission result:`, data);
      return data as QuizAnswer;
    } catch (e) {
      log.error('[Quiz] Submission failed:', e);
      return { success: false, message: 'Internal server error' };
    }
  },

  /**
   * Fetch quiz stats for a user
   */
  async fetchQuizStats(userId: string, roomId?: number): Promise<QuizStats | null> {
    try {
      let query = supabase
        .from('user_quiz_stats')
        .select('*')
        .eq('user_id', userId);

      if (roomId !== undefined) {
        query = query.eq('room_id', roomId);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (!data || data.length === 0) return null;

      // If multiple rooms and no specific roomId, we might need to aggregate or just return the first
      return data[0] as QuizStats;
    } catch (e) {
      log.error('[Quiz] Failed to fetch stats:', e);
      return null;
    }
  },

  /**
   * Get a random unanswered question
   */
  async getRandomQuestion(roomId: number, userId: string): Promise<QuizQuestion | null> {
    const unanswered = await this.fetchUnansweredQuizzes(roomId, userId);
    if (unanswered.length === 0) return null;
    return unanswered[Math.floor(Math.random() * unanswered.length)];
  },

  /**
   * Invalidate cache
   */
  invalidateQuizCache(roomId?: number) {
    if (roomId !== undefined) {
      delete quizCache[roomId];
      log.info(`[Quiz] Cache invalidated for room ${roomId}`);
    } else {
      Object.keys(quizCache).forEach(key => delete quizCache[Number(key)]);
      log.info('[Quiz] All quiz cache invalidated');
    }
  }
};
