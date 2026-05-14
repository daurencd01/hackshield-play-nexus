import { useEffect, useState } from 'react';
import { quizService } from '@/services/quizService';
import type { Quiz } from '@/types/quiz';

interface UseQuizzesOptions {
  difficulty?: number;
  category?: string;
  enabled?: boolean;
}

export function useQuizzes(options: UseQuizzesOptions = {}) {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (options.enabled === false) {
      setLoading(false);
      return;
    }

    let mounted = true;

    quizService.getByFilter({
      difficulty: options.difficulty,
      category: options.category
    })
      .then(data => {
        if (mounted) {
          setQuizzes(data);
          setLoading(false);
        }
      })
      .catch(err => {
        if (mounted) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => { mounted = false; };
  }, [options.difficulty, options.category, options.enabled]);

  return { quizzes, loading, error };
}

// Получить случайный квиз для комнаты по сложности
export function useRandomQuizForRoom(roomDifficulty: number) {
  const { quizzes, loading } = useQuizzes({ difficulty: roomDifficulty });

  const quiz = quizzes.length > 0
    ? quizzes[Math.floor(Math.random() * quizzes.length)]
    : null;

  return { quiz, loading };
}
