import { useEffect } from 'react';
import { GS, CW, CH } from './constants';
import { renderGame } from './GameRenderers';
import { updatePhysics } from './gameLogic';

export function useGameLoop(
  gs: React.MutableRefObject<GS>,
  canvasRef: React.RefObject<HTMLCanvasElement>,
  phase: string
) {
  useEffect(() => {
    if (phase !== "playing" || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = CW * dpr;
    canvas.height = CH * dpr;
    canvas.style.width = '100%';
    canvas.style.height = 'auto';
    canvas.style.aspectRatio = `${CW} / ${CH}`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = performance.now();

    const tick = (nowMs: number) => {
      const gameState = gs.current;
      
      const dt = Math.min(0.1, (nowMs - lastTime) / 1000);
      lastTime = nowMs;

      // 1. Physics & Logic
      updatePhysics(gameState, dt);

      // 2. Render Interpolation
      const lerp = 15;
      gameState.playerRender.x += (gameState.playerPos.x - gameState.playerRender.x) * lerp * dt;
      gameState.playerRender.y += (gameState.playerPos.y - gameState.playerRender.y) * lerp * dt;

      // 3. Render
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      renderGame(ctx, gameState, nowMs / 1000, dt);

      gameState.rafId = requestAnimationFrame(tick);
    };

    gs.current.rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(gs.current.rafId);
  }, [phase, canvasRef, gs]);
}
