import { supabase } from '@/integrations/supabase/client';
import { QuizSchema, type Quiz } from '@/types/quiz';
import { safeStorage } from '@/utils/safeStorage';

const TIMEOUT_MS = 5000;
const CACHE_KEY = 'quizzes_cache';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 часа

interface QuizCache {
  data: Quiz[];
  timestamp: number;
}

async function withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), ms)
    )
  ]);
}

export const quizService = {
  /**
   * Получить все квизы (с кэшированием)
   */
  async getAll(forceRefresh = false): Promise<Quiz[]> {
    // Проверяем кэш
    if (!forceRefresh) {
      const cached = safeStorage.get<QuizCache | null>(
        CACHE_KEY,
        (raw) => raw as QuizCache,
        null
      );

      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        console.log('[Quiz] Loaded from cache');
        return cached.data;
      }
    }

    try {
      // Загружаем из Supabase
      const { data, error } = await withTimeout(
        supabase
          .from('quizzes')
          .select(`
            *,
            options:quiz_options(*)
          `)
          .eq('is_published', true)
          .order('difficulty', { ascending: true }),
        TIMEOUT_MS
      );

      if (error) throw error;

      const quizzes = (data || []).map(d => {
        // Сортируем варианты по order_index
        if (d.options) {
          d.options.sort((a: any, b: any) => a.order_index - b.order_index);
        }
        return QuizSchema.parse(d);
      });

      // Кэшируем
      safeStorage.set(CACHE_KEY, {
        data: quizzes,
        timestamp: Date.now()
      });

      console.log(`[Quiz] Loaded ${quizzes.length} quizzes from Supabase`);
      return quizzes;
    } catch (e) {
      console.error('[Quiz] Load failed:', e);

      // Возвращаем из кэша даже устаревшего
      const cached = safeStorage.get<QuizCache | null>(
        CACHE_KEY,
        (raw) => raw as QuizCache,
        null
      );
      if (cached) {
        console.warn('[Quiz] Using stale cache');
        return cached.data;
      }

      return [];
    }
  },

  /**
   * Получить квиз по ID
   */
  async getById(quizId: string): Promise<Quiz | null> {
    const all = await this.getAll();
    return all.find(q => q.id === quizId) || null;
  },

  /**
   * Получить квиз по сложности и категории
   */
  async getByFilter(filter: {
    difficulty?: number;
    category?: string;
    randomize?: boolean;
  }): Promise<Quiz[]> {
    const all = await this.getAll();
    let filtered = all;

    if (filter.difficulty !== undefined) {
      filtered = filtered.filter(q => q.difficulty === filter.difficulty);
    }
    if (filter.category) {
      filtered = filtered.filter(q => q.category_id === filter.category);
    }
    if (filter.randomize) {
      filtered = [...filtered].sort(() => Math.random() - 0.5);
    }

    return filtered;
  },

  /**
   * Очистить кэш
   */
  clearCache() {
    safeStorage.remove(CACHE_KEY);
  },

  /**
   * Проверить ответ
   */
  checkAnswer(quiz: Quiz, userAnswer: any): boolean {
    switch (quiz.type) {
      case 'multiple_choice': {
        const correctOption = quiz.options.find(o => o.is_correct);
        return correctOption?.id === userAnswer;
      }

      case 'text_input': {
        if (!quiz.correct_answer) return false;
        const normalize = (s: string) =>
          quiz.case_sensitive ? s.trim() : s.trim().toLowerCase();

        const expected = [quiz.correct_answer, ...quiz.accept_variants].map(normalize);
        const got = normalize(String(userAnswer));
        return expected.includes(got);
      }

      case 'binary':
        return quiz.correct_choice === userAnswer;

      case 'sequence': {
        if (!Array.isArray(userAnswer)) return false;
        return JSON.stringify(quiz.correct_sequence) === JSON.stringify(userAnswer);
      }

      default:
        return false;
    }
  }
};
