import { useRef } from 'react';
import { GS, CW, CH, WALL } from './constants';

export * from './constants';

export function useGameState() {
  const gs = useRef<GS>({
    playerPos: { x: 100, y: CH / 2 },
    playerRender: { x: 100, y: CH / 2 },
    playerDir: { x: 1, y: 0 },
    playerHealth: 100,
    playerMaxHealth: 100,
    xp: 0,
    currentRoom: 0,
    gameObjects: [],
    lasers: [],
    particles: [],
    logs: [],
    nearObject: null,
    showQuiz: false,
    currentQuiz: null,
    keys: { up: false, down: false, left: false, right: false, interact: false },
    lastTime: 0,
    rafId: 0,
    roomIdx: 0,
    transitioning: false,
    glitchEffect: 0,
    canvas: null,
    audioCtx: null,
    sessionXp: 0,
    interactCooldown: 0,
  });

  return gs;
}
