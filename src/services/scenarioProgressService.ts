import { supabase } from '@/integrations/supabase/client';
import { ScenarioProgressSchema, type ScenarioProgress } from '@/types/scenarioProgress';
import { safeStorage } from '@/utils/safeStorage';

const TIMEOUT_MS = 3000;
const LOCAL_FALLBACK_KEY = 'scenario_progress_local';

async function withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), ms)
    )
  ]);
}

export const scenarioProgressService = {
  async getOrCreate(userId: string, missionId: string, scenarioId: string): Promise<ScenarioProgress> {
    try {
      const { data, error } = await withTimeout(
        supabase
          .from('scenario_progress')
          .select('*')
          .eq('user_id', userId)
          .eq('scenario_id', scenarioId)
          .maybeSingle(),
        TIMEOUT_MS
      );

      if (error) throw error;

      if (data) {
        return ScenarioProgressSchema.parse(data);
      }

      const newProgress: ScenarioProgress = {
        user_id: userId,
        mission_id: missionId,
        scenario_id: scenarioId,
        current_step_id: null,
        completed_steps: [],
        history: [],
        total_xp: 0,
        hints_used: 0,
        flags: {},
        answers: {},
        status: 'in_progress',
        attempts: 1
      };

      const { data: created, error: createError } = await withTimeout(
        supabase
          .from('scenario_progress')
          .insert(newProgress)
          .select()
          .single(),
        TIMEOUT_MS
      );

      if (createError) throw createError;

      return ScenarioProgressSchema.parse(created);
    } catch (e) {
      console.warn('[scenarioProgress] Supabase failed, using local:', e);
      const localKey = `${LOCAL_FALLBACK_KEY}_${scenarioId}`;
      return safeStorage.get(
        localKey,
        (raw) => ScenarioProgressSchema.parse(raw),
        {
          user_id: userId,
          mission_id: missionId,
          scenario_id: scenarioId,
          current_step_id: null,
          completed_steps: [],
          history: [],
          total_xp: 0,
          hints_used: 0,
          flags: {},
          answers: {},
          status: 'in_progress',
          attempts: 1
        }
      );
    }
  },

  async update(scenarioId: string, updates: Partial<ScenarioProgress>): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await withTimeout(
        supabase
          .from('scenario_progress')
          .update(updates)
          .eq('user_id', user.id)
          .eq('scenario_id', scenarioId),
        TIMEOUT_MS
      );

      if (error) throw error;
    } catch (e) {
      console.warn('[scenarioProgress] Update failed, saving locally:', e);
      const localKey = `${LOCAL_FALLBACK_KEY}_${scenarioId}`;
      const current = safeStorage.get<ScenarioProgress>(localKey, (raw) => raw as ScenarioProgress, null as any);
      if (current) {
        safeStorage.set(localKey, { ...current, ...updates });
      }
    }
  }
};
