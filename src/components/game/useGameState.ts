import { useRef, useState } from 'react';
import { GameObject } from '@/data/roomGenerator';
import { RoomTask } from '@/data/russianTasks';
import { LogLine } from './GameRenderers';

export interface Vec2 { x: number; y: number }

export interface Keys {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

export interface Bullet {
  x: number; y: number;
  vx: number; vy: number;
  life: number;
  damage: number;
}

export interface PlayerTrail {
  x: number; y: number;
  alpha: number;
}

export interface HackEffect {
  x: number; y: number;
  life: number;
  color: string;
}

export interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number;
  color: string;
  size: number;
}

export interface MatrixColumn {
  x: number;
  chars: { y: number; char: string; speed: number; alpha: number }[];
}

export interface ScanLine {
  y: number;
  speed: number;
  height: number;
  alpha: number;
}

export interface GS {
  playerTarget: Vec2;
  playerRender: Vec2;
  playerDir: Vec2;
  playerMoving: boolean;
  keys: Keys;
  interactCooldown: number;
  objects: GameObject[];
  nearbyIdx: number | null;
  hintAlpha: number;
  doorOpenAnim: number;
  bullets: Bullet[];
  rafId: number;
  lastTime: number;
  modalOpen: boolean;
  transitionAlpha: number;
  transitioning: boolean;
  paused: boolean;
  health: number;
  maxHealth: number;
  hasKeyCard: boolean;
  speedMultiplier: number;
  speedBoostUntil: number;
  sessionXp: number;
  timeRemaining: number;
  matrixColumns: MatrixColumn[];
  scanline: ScanLine;
  trail: PlayerTrail[];
  trailTimer: number;
  logs: LogLine[];
  nextLogTime: number;
  hackEffects: HackEffect[];
  isCrouching: boolean;
  alarmActive: boolean;
  alarmCamera: string | null;
  screenFlash: { color: string; alpha: number; fadeTime: number } | null;
  glitchEffect: number;
  dataDrops: any[];
  canvas: HTMLCanvasElement | null;
  audioCtx: AudioContext | null;
  particles: Particle[];
}

export const CW = 640;
export const CH = 400;
export const WALL = 24;

export function useGameState() {
  const gs = useRef<GS>({
    playerTarget: { x: WALL + 40, y: CH / 2 },
    playerRender: { x: WALL + 40, y: CH / 2 },
    playerDir: { x: 1, y: 0 },
    playerMoving: false,
    keys: { up: false, down: false, left: false, right: false },
    interactCooldown: 0,
    objects: [],
    nearbyIdx: null,
    hintAlpha: 0,
    doorOpenAnim: 0,
    bullets: [],
    rafId: 0,
    lastTime: 0,
    modalOpen: false,
    transitionAlpha: 0,
    transitioning: false,
    paused: false,
    health: 100,
    maxHealth: 100,
    hasKeyCard: false,
    speedMultiplier: 1,
    speedBoostUntil: 0,
    sessionXp: 0,
    timeRemaining: 300,
    matrixColumns: [],
    scanline: { y: 0, speed: 80, height: 60, alpha: 0.08 },
    trail: [],
    trailTimer: 0,
    logs: [],
    nextLogTime: 1,
    hackEffects: [],
    isCrouching: false,
    alarmActive: false,
    alarmCamera: null,
    screenFlash: null,
    glitchEffect: 0,
    dataDrops: [],
    canvas: null,
    audioCtx: null,
    particles: [],
  });

  return gs;
}
