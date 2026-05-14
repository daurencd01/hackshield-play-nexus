import { useEffect, useState, useCallback, useRef } from 'react';
import { gameProgressService } from '@/services/gameProgressService';
import { useAuth } from '@/contexts/AuthContext';
import type { GameProgress } from '@/types/gameProgress';

export function useGameProgress(missionId: string) {
  const { user } = useAuth();
  const [progress, setProgress] = useState<GameProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const lastSaveRef = useRef<number>(0);

  // Загрузить при монтировании
  useEffect(() => {
    if (!user || !missionId) {
      setLoading(false);
      return;
    }

    let mounted = true;

    gameProgressService.getOrCreate(user.id, missionId)
      .then(p => {
        if (mounted) {
          setProgress(p);
          setLoading(false);
          console.log('[GameProgress] Loaded room:', p.current_room_index);
        }
      })
      .catch(err => {
        console.error('[GameProgress] Load failed:', err);
        if (mounted) setLoading(false);
      });

    return () => { mounted = false; };
  }, [user, missionId]);

  // Сохранить прогресс
  const saveProgress = useCallback(async (updates: Partial<GameProgress>) => {
    if (!progress) return;

    const merged = { ...progress, ...updates };
    setProgress(merged);

    // Дебаунс — не сохраняем чаще чем раз в секунду
    const now = Date.now();
    if (now - lastSaveRef.current < 1000) return;
    lastSaveRef.current = now;

    await gameProgressService.update(missionId, updates);
  }, [progress, missionId]);

  // Завершить комнату
  const completeRoom = useCallback(async (roomIndex: number, xp: number) => {
    if (!user) return;
    await gameProgressService.completeRoom(missionId, roomIndex, xp);

    // Перечитать прогресс
    const fresh = await gameProgressService.getOrCreate(user.id, missionId);
    setProgress(fresh);
  }, [user, missionId]);

  // Сбросить
  const resetProgress = useCallback(async () => {
    await gameProgressService.reset(missionId);
    if (user) {
      const fresh = await gameProgressService.getOrCreate(user.id, missionId);
      setProgress(fresh);
    }
  }, [user, missionId]);

  return {
    progress,
    loading,
    saveProgress,
    completeRoom,
    resetProgress
  };
}
