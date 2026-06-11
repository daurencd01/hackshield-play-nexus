import { useReducer, useEffect, useCallback } from "react";
import { Scenario, ScenarioStep } from "@/types/scenario";
import { scenarioProgressService } from '@/services/scenarioProgressService';
import { useAuth } from '@/contexts/AuthContext';

export interface EngineState {
  steps: ScenarioStep[];
  currentIndex: number;
  totalXp: number;
  hintsUsed: number;
  timeRemaining: number | null;
  history: string[]; // for multi-step consequences
  isCompleted: boolean;
  selectedChoice: string | null;
  feedback: { message: string; isCorrect: boolean } | null;
  flags: Record<string, boolean>;
}

export type EngineAction =
  | { type: "INIT"; steps: ScenarioStep[] }
  | { type: "SELECT_CHOICE"; choiceId: string; xp: number; consequence: string; isOptimal: boolean; nextStepIndex?: number }
  | { type: "NEXT_STEP" }
  | { type: "USE_HINT" }
  | { type: "TICK_TIME" }
  | { type: "RESTORE"; payload: Partial<EngineState> };

const initialState: EngineState = {
  steps: [],
  currentIndex: 0,
  totalXp: 0,
  hintsUsed: 0,
  timeRemaining: null,
  history: [],
  isCompleted: false,
  selectedChoice: null,
  feedback: null,
  flags: {}
};

function engineReducer(state: EngineState, action: EngineAction): EngineState {
  switch (action.type) {
    case "INIT":
      return { ...initialState, steps: action.steps };
    case "RESTORE":
      return { ...state, ...action.payload };
    case "SELECT_CHOICE":
      return {
        ...state,
        selectedChoice: action.choiceId,
        totalXp: state.totalXp + action.xp,
        history: [...state.history, action.choiceId],
        feedback: { message: action.consequence, isCorrect: action.isOptimal },
      };
    case "NEXT_STEP":
      if (state.currentIndex >= state.steps.length - 1) {
        return { ...state, isCompleted: true };
      }
      return {
        ...state,
        currentIndex: state.currentIndex + 1,
        selectedChoice: null,
        feedback: null,
        timeRemaining: null,
      };
    case "USE_HINT":
      return { ...state, hintsUsed: state.hintsUsed + 1, totalXp: Math.max(0, state.totalXp - 10) };
    case "TICK_TIME":
      if (state.timeRemaining === null || state.timeRemaining <= 0) return state;
      return { ...state, timeRemaining: state.timeRemaining - 1 };
    default:
      return state;
  }
}

export function useScenarioEngine(scenario: Scenario, missionId: string) {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(engineReducer, { ...initialState, steps: scenario.steps });

  // Загрузить сохранённый прогресс
  useEffect(() => {
    if (!user) return;

    scenarioProgressService.getOrCreate(user.id, missionId, scenario.id)
      .then(progress => {
        if (progress.current_step_id) {
          // Находим индекс шага по его ID
          const stepIndex = scenario.steps.findIndex(s => s.id === progress.current_step_id);
          
          dispatch({
            type: 'RESTORE',
            payload: {
              currentIndex: stepIndex !== -1 ? stepIndex : 0,
              history: progress.history,
              totalXp: progress.total_xp,
              hintsUsed: progress.hints_used,
              flags: progress.flags,
              isCompleted: progress.status === 'completed'
            }
          });
          console.log('[Scenario] Restored to step:', progress.current_step_id);
        }
      });
  }, [user, missionId, scenario]);

  // Автосейв при изменениях
  useEffect(() => {
    if (!user || state.steps.length === 0) return;

    const currentStepId = state.steps[state.currentIndex]?.id;
    if (!currentStepId) return;

    const saveTimeout = setTimeout(() => {
      scenarioProgressService.update(scenario.id, {
        current_step_id: currentStepId,
        history: state.history,
        total_xp: state.totalXp,
        hints_used: state.hintsUsed,
        flags: state.flags,
        completed_steps: state.history,
        status: state.isCompleted ? 'completed' : 'in_progress',
        completed_at: state.isCompleted ? new Date().toISOString() : null
      });
    }, 1500); // дебаунс

    return () => clearTimeout(saveTimeout);
  }, [state.currentIndex, state.history, state.totalXp, state.hintsUsed, state.flags, state.isCompleted, user, scenario.id]);

  // Timer effect
  useEffect(() => {
    if (state.timeRemaining !== null && state.timeRemaining > 0 && !state.feedback) {
      const timer = setInterval(() => dispatch({ type: "TICK_TIME" }), 1000);
      return () => clearInterval(timer);
    }
  }, [state.timeRemaining, state.feedback]);

  return { state, dispatch };
}
