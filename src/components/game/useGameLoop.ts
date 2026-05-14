import { useEffect, useRef } from 'react';
import { GS, CW, CH } from './useGameState';
import { renderObjects, renderPlayer, renderHUD } from './GameRenderers';
import { updatePlayerMovement, updateNearbyObject, updateStealth, updateParticles, INTERACT_COOLDOWN } from './gameLogic';

export function useGameLoop(
  gs: React.MutableRefObject<GS>,
  canvasRef: React.RefObject<HTMLCanvasElement>,
  phase: string,
  roomIdx: number,
  totalRooms: number,
  totalXP: number
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

    const tick = (nowMs: number) => {
      const g = gs.current;
      if (g.paused) {
        g.rafId = requestAnimationFrame(tick);
        return;
      }

      const now = nowMs / 1000;
      if (!g.lastTime) g.lastTime = now;
      const dt = Math.min(0.1, now - g.lastTime);
      g.lastTime = now;

      // Update player position
      const lerp = 14;
      g.playerRender.x += (g.playerTarget.x - g.playerRender.x) * lerp * dt;
      g.playerRender.y += (g.playerTarget.y - g.playerRender.y) * lerp * dt;

      // Interaction cooldown
      if (g.interactCooldown > 0) g.interactCooldown -= dt;

      // Logic
      updatePlayerMovement(g, dt);
      updateNearbyObject(g, dt);
      updateStealth(g, dt, now);
      updateParticles(g, dt);

      // Render
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Floor grid
      ctx.save(); ctx.scale(dpr, dpr);
      ctx.strokeStyle = "#141c2e"; ctx.lineWidth = 1;
      for (let x = 0; x < CW; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CH); ctx.stroke(); }
      for (let y = 0; y < CH; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CW, y); ctx.stroke(); }
      ctx.restore();

      renderObjects(ctx, dpr, g, now, dt);
      renderPlayer(ctx, dpr, g, now, dt);
      renderHUD(ctx, dpr, roomIdx, totalRooms, totalXP + g.sessionXp, now, g.health, g.maxHealth, g.hasKeyCard);

      g.rafId = requestAnimationFrame(tick);
    };

    gs.current.rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(gs.current.rafId);
  }, [phase, canvasRef, gs, roomIdx, totalRooms, totalXP]);
}
