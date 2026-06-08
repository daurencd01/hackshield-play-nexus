export const CW = 700;
export const CH = 500;
export const WALL = 20;

export interface Vec2 { x: number; y: number }

export interface Keys {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  interact: boolean;
}

export interface LogLine {
  text: string;
  color: string;
  time: number;
}

export interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number;
  color: string;
  size: number;
}

export interface Laser {
  x1: number; y1: number;
  x2: number; y2: number;
  active: boolean;
  damage: number;
  color: string;
}

export type GameObjectType = 'terminal' | 'server' | 'data_node' | 'collectible' | 'npc' | 'firewall' | 'exit_portal' | 'wall';

export interface GameObject {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: GameObjectType;
  label?: string;
  completed?: boolean;
  hacked?: boolean;
  animPhase?: number;
}

import { QuizQuestion } from '@/services/quizService';

export interface GS {
  playerPos: Vec2;
  playerRender: Vec2;
  playerDir: Vec2;
  playerHealth: number;
  playerMaxHealth: number;
  xp: number;
  currentRoom: number;
  gameObjects: GameObject[];
  lasers: Laser[];
  particles: Particle[];
  logs: LogLine[];
  nearObject: GameObject | null;
  showQuiz: boolean;
  currentQuiz: QuizQuestion | null;
  keys: Keys;
  lastTime: number;
  rafId: number;
  roomIdx: number;
  transitioning: boolean;
  glitchEffect: number;
  canvas: HTMLCanvasElement | null;
  audioCtx: AudioContext | null;
  sessionXp: number;
  interactCooldown: number;
}
