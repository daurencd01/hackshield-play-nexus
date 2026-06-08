export type Difficulty = "easy" | "medium" | "hard" | "expert" | "legendary";

export interface Mission {
  id: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  xpReward: number;
  status: "locked" | "available" | "in-progress" | "completed";
  chapter: number;
  type: "simulation" | "scenario";
  icon: string;
  briefing: string;
}

export type ScenarioStep =
  | { id: string; type: "narrative"; text: string; speaker?: string }
  | { id: string; type: "terminal"; text: string; speaker?: string }
  | { id: string; type: "outcome"; text: string }
  | { id: string; type: "dialogue"; content: string }
  | { id: string; type: "log"; content: string }
  | { id: string; type: "result"; content: string }
  | {
      id: string;
      type: "situation";
      text?: string;
      question?: string;
      choices?: {
        id: string;
        text: string;
        consequence: string;
        xpGain: number;
        isOptimal: boolean;
      }[];
      options?: {
        text: string;
        isCorrect: boolean;
        explanation: string;
        xpAward: number;
      }[];
    };

export interface Scenario {
  id: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  category: "phishing" | "network" | "password" | "social engineering" | "device";
  steps: ScenarioStep[];
}
