
export type EntityType = 'player' | 'guard' | 'camera' | 'door' | 'terminal' | 'laser' | 'vent' | 'keycard' | 'emp' | 'medkit' | 'alarm_button';

export type GuardState = 'patrol' | 'alert' | 'chase' | 'searching' | 'stunned';
export type DoorState = 'open' | 'closed' | 'locked' | 'broken';
export type CameraState = 'active' | 'hacked' | 'destroyed';
export type AlarmState = 'normal' | 'triggered' | 'lockdown';

export interface Vec2 { x: number; y: number; }

export interface Player {
  id: string;
  username: string;
  position: Vec2;
  velocity: Vec2;
  health: number;
  maxHealth: number;
  xp: number;
  isStealthMode: boolean;     // прижался к стене
  isInVent: boolean;
  isStunned: boolean;
  stunUntil: number;
  empCharges: number;
  keycards: ('blue' | 'red' | 'gold')[];
  facing: number;             // угол в радианах
  color: string;              // для отличия в копе
}

export interface Guard {
  id: string;
  position: Vec2;
  state: GuardState;
  patrolPoints: Vec2[];
  currentPatrolIndex: number;
  visionAngle: number;         // куда смотрит (радианы)
  visionRange: number;         // дальность зрения
  visionFOV: number;           // угол обзора
  speed: number;
  alertLevel: number;          // 0-100, накопление при виде игрока
  lastSeenPlayerPos: Vec2 | null;
  searchTimer: number;
}

export interface Camera {
  id: string;
  position: Vec2;
  state: CameraState;
  hackedUntil: number;
  rotationAngle: number;       // текущий угол поворота
  rotationSpeed: number;       // sweep speed
  rotationRange: [number, number]; // min/max угол
  visionRange: number;
  visionFOV: number;
  detectionTimer: number;      // как долго видит игрока
}

export interface Door {
  id: string;
  position: Vec2;
  width: number;
  height: number;
  state: DoorState;
  isHorizontal: boolean;
  requiredKeycard?: 'blue' | 'red' | 'gold';
  unlockedUntil: number;       // 0 = постоянно, иначе timestamp
}

export interface Terminal {
  id: string;
  position: Vec2;
  isMainObjective: boolean;
  isHacked: boolean;
  hackProgress: number;
  questionId?: string;
}

export interface Laser {
  id: string;
  start: Vec2;
  end: Vec2;
  isActive: boolean;
  blinkPattern?: { onMs: number; offMs: number };
  triggersAlarm: boolean;
}

export interface RoomConfig {
  id: number;
  name: string;
  description: string;
  theme: string;
  difficulty: 'tutorial' | 'easy' | 'medium' | 'hard' | 'expert' | 'boss';
  width: number;
  height: number;
  backgroundColor: string;
  walls: { x: number; y: number; w: number; h: number }[];
  shadows: { x: number; y: number; w: number; h: number }[]; // зоны укрытия
  spawnPoints: Vec2[]; // [solo, coop_p1, coop_p2]
  exitPoint: Vec2;
  guards: Omit<Guard, 'id'>[];
  cameras: Omit<Camera, 'id'>[];
  doors: Omit<Door, 'id'>[];
  terminals: Omit<Terminal, 'id'>[];
  lasers: Omit<Laser, 'id'>[];
  collectibles: { type: 'keycard_blue'|'keycard_red'|'keycard_gold'|'emp'|'medkit'|'usb'|'data'|'intel'; position: Vec2 }[];
  props?: { type: 'server'|'datacore'|'console'|'crate'; x: number; y: number }[];
  ventilation: { x: number; y: number; w: number; h: number }[];
  alarmButtons: Vec2[];
  objective: string; // "Взломайте центральный сервер и достигните выхода"
}

export interface GameState {
  mode: 'solo' | 'coop';
  sessionId: string | null;
  roomCode: string | null;
  currentRoomId: number;
  totalRooms: 20;
  players: Map<string, Player>;
  localPlayerId: string;
  isHost: boolean;
  guards: Guard[];
  cameras: Camera[];
  doors: Door[];
  terminals: Terminal[];
  lasers: Laser[];
  collectibles: any[];
  alarmState: AlarmState;
  alarmEndsAt: number;
  detectionLevel: number; // 0-100, общий уровень тревоги
  showQuiz: boolean;
  currentQuiz: any | null;
  activeHackTarget: string | null;
  missionStatus: 'briefing' | 'in_progress' | 'success' | 'failed';
  startedAt: number;
  message: string | null;
}

// Realtime события (broadcast через Supabase)
export type GameEvent =
  | { type: 'player_move'; userId: string; position: Vec2; facing: number; }
  | { type: 'player_action'; userId: string; action: 'hack_start'|'hack_complete'|'door_open'|'use_emp'|'pickup'; targetId?: string; }
  | { type: 'player_state'; userId: string; health: number; isStunned: boolean; }
  | { type: 'world_update'; alarmState: AlarmState; detectionLevel: number; } // только от хоста
  | { type: 'guard_update'; guards: Guard[]; }                                 // только от хоста
  | { type: 'camera_update'; cameras: Camera[]; }                              // только от хоста
  | { type: 'quick_chat'; userId: string; message: string; }
  | { type: 'mission_complete'; }
  | { type: 'mission_failed'; reason: string; };

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  full_name: string | null;
  role: string;
  xp: number;
  created_at: string;
  avatar_url: string | null;
  telegram?: string | null;
  instagram?: string | null;
}

export interface ScenarioRoom {
  id: string;
  mission_id: string;
  title: string;
  task: string;
  correct_answer: string;
  order_index: number;
}
