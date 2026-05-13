import { useReducer, useEffect } from "react";
import { ScenarioStep } from "@/types/scenario";

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
}

export type EngineAction =
  | { type: "INIT"; steps: ScenarioStep[] }
  | { type: "SELECT_CHOICE"; choiceId: string; xp: number; consequence: string; isOptimal: boolean; nextStepIndex?: number }
  | { type: "NEXT_STEP" }
  | { type: "USE_HINT" }
  | { type: "TICK_TIME" };

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
};

function engineReducer(state: EngineState, action: EngineAction): EngineState {
  switch (action.type) {
    case "INIT":
      return { ...initialState, steps: action.steps };
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
        timeRemaining: null, // Reset timer for next step if needed
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

export function useScenarioEngine(initialSteps: ScenarioStep[] = []) {
  const [state, dispatch] = useReducer(engineReducer, initialState);

  useEffect(() => {
    if (initialSteps.length > 0) {
      dispatch({ type: "INIT", steps: initialSteps });
    }
  }, [initialSteps]);

  // Timer effect
  useEffect(() => {
    if (state.timeRemaining !== null && state.timeRemaining > 0 && !state.feedback) {
      const timer = setInterval(() => dispatch({ type: "TICK_TIME" }), 1000);
      return () => clearInterval(timer);
    }
  }, [state.timeRemaining, state.feedback]);

  return { state, dispatch };
}
