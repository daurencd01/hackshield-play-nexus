export interface ScenarioRoom {
  id: string;
  mission_id: string;
  title: string;
  task: string;
  correct_answer: string;
  order_index: number;
}

export interface UserProfile {
  id: string;
  email: string | null;
  xp: number;
  username: string | null;
  full_name: string | null;
  role: string | null;
  created_at: string | null;
  avatar_url: string | null;
  telegram: string | null;
  instagram: string | null;
}
