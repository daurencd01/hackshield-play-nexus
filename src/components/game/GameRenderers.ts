import { GS, CW, CH, WALL, GameObject } from './constants';

export function renderGame(ctx: CanvasRenderingContext2D, gs: GS, now: number, dt: number) {
  const dpr = window.devicePixelRatio || 1;
  ctx.save();
  ctx.scale(dpr, dpr);
  
  // 1. Background Grid
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, CW, CH);
  
  ctx.strokeStyle = "rgba(0, 255, 136, 0.05)";
  ctx.lineWidth = 1;
  for (let x = 0; x < CW; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CH); ctx.stroke();
  }
  for (let y = 0; y < CH; y += 40) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CW, y); ctx.stroke();
  }

  // 2. Render Game Objects
  gs.gameObjects.forEach(obj => renderObject(ctx, obj, now));

  // 3. Render Lasers
  gs.lasers.forEach(laser => {
    if (!laser.active) return;
    const pulse = 0.5 + 0.5 * Math.sin(now * 15);
    ctx.save();
    ctx.strokeStyle = laser.color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.3 + 0.7 * pulse;
    ctx.shadowBlur = 10 * pulse;
    ctx.shadowColor = laser.color;
    ctx.beginPath();
    ctx.moveTo(laser.x1, laser.y1);
    ctx.lineTo(laser.x2, laser.y2);
    ctx.stroke();
    ctx.restore();
  });

  // 4. Render Particles
  gs.particles.forEach(p => {
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.life;
    ctx.fillRect(p.x, p.y, p.size, p.size);
  });
  ctx.globalAlpha = 1.0;

  // 5. Render Player
  renderPlayer(ctx, gs, now);

  // 6. Interaction Hint
  if (gs.nearObject) {
    const obj = gs.nearObject;
    ctx.save();
    ctx.strokeStyle = "#00ff88";
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(obj.x - 5, obj.y - 5, obj.width + 10, obj.height + 10);
    
    ctx.fillStyle = "#00ff88";
    ctx.font = "10px 'JetBrains Mono', monospace";
    const label = obj.type === 'exit_portal' ? "EXIT [E]" : "HACK [E]";
    ctx.fillText(label, obj.x, obj.y - 15);
    ctx.restore();
  }

  // 7. HUD
  renderHUD(ctx, gs);

  ctx.restore();
}

function renderObject(ctx: CanvasRenderingContext2D, obj: GameObject, now: number) {
  ctx.save();
  const pulse = 0.8 + 0.2 * Math.sin(now * 5 + (obj.animPhase || 0));

  switch (obj.type) {
    case 'terminal':
      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
      ctx.fillStyle = obj.completed ? "#00ff88" : "#333";
      ctx.fillRect(obj.x + 4, obj.y + 4, obj.width - 8, obj.height / 2);
      if (!obj.completed) {
        ctx.fillStyle = `rgba(0, 255, 136, ${0.1 * pulse})`;
        ctx.fillRect(obj.x + 4, obj.y + 4, obj.width - 8, obj.height / 2);
      }
      break;

    case 'server':
      ctx.fillStyle = "#111";
      ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
      // LED indicators
      for (let i = 0; i < 4; i++) {
        const ledOn = (Math.sin(now * 10 + i) > 0);
        ctx.fillStyle = ledOn ? (obj.completed ? "#00ff88" : "#ff3366") : "#222";
        ctx.fillRect(obj.x + 4, obj.y + 6 + i * 8, 4, 4);
      }
      break;

    case 'data_node':
      ctx.save();
      ctx.translate(obj.x + obj.width / 2, obj.y + obj.height / 2);
      ctx.rotate(now);
      ctx.fillStyle = obj.completed ? "#00ff88" : "#00ccff";
      ctx.shadowBlur = 15 * pulse;
      ctx.shadowColor = ctx.fillStyle;
      ctx.beginPath();
      ctx.moveTo(0, -obj.height / 2);
      ctx.lineTo(obj.width / 2, 0);
      ctx.lineTo(0, obj.height / 2);
      ctx.lineTo(-obj.width / 2, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      break;

    case 'collectible':
      ctx.save();
      ctx.translate(obj.x + obj.width / 2, obj.y + obj.height / 2);
      ctx.rotate(now * 2);
      ctx.fillStyle = "#ffcc00";
      ctx.shadowBlur = 10;
      ctx.shadowColor = "#ffcc00";
      // Star shape
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        ctx.rotate(Math.PI / 2.5);
        ctx.lineTo(0, obj.width / 2);
        ctx.rotate(Math.PI / 2.5);
        ctx.lineTo(0, obj.width / 4);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      break;

    case 'npc':
      ctx.save();
      const bob = Math.sin(now * 4) * 5;
      ctx.translate(obj.x + obj.width / 2, obj.y + obj.height / 2 + bob);
      ctx.fillStyle = "#6366f1";
      ctx.beginPath();
      ctx.arc(0, 0, obj.width / 2, 0, Math.PI * 2);
      ctx.fill();
      // Eyes
      ctx.fillStyle = "#fff";
      ctx.fillRect(-5, -3, 3, 3);
      ctx.fillRect(2, -3, 3, 3);
      ctx.restore();
      break;

    case 'exit_portal':
      const grad = ctx.createRadialGradient(
        obj.x + obj.width / 2, obj.y + obj.height / 2, 0,
        obj.x + obj.width / 2, obj.y + obj.height / 2, obj.width / 2
      );
      grad.addColorStop(0, `rgba(0, 255, 136, ${0.8 * pulse})`);
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(obj.x + obj.width / 2, obj.y + obj.height / 2, (obj.width / 2) * pulse, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'wall':
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
      ctx.strokeStyle = "#334155";
      ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
      break;
  }
  ctx.restore();
}

function renderPlayer(ctx: CanvasRenderingContext2D, gs: GS, now: number) {
  const p = gs.playerRender;
  ctx.save();
  
  // Health aura
  const healthPerc = gs.playerHealth / gs.playerMaxHealth;
  const color = healthPerc > 0.6 ? "#00ff88" : healthPerc > 0.3 ? "#ffaa00" : "#ff3366";
  
  ctx.shadowBlur = 15;
  ctx.shadowColor = color;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
  ctx.fill();

  // HP Bar above head
  ctx.fillStyle = "#000";
  ctx.fillRect(p.x - 15, p.y - 25, 30, 4);
  ctx.fillStyle = color;
  ctx.fillRect(p.x - 15, p.y - 25, 30 * healthPerc, 4);

  ctx.restore();
}

function renderHUD(ctx: CanvasRenderingContext2D, gs: GS) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.fillRect(10, 10, 120, 50);
  ctx.strokeStyle = "#00ff88";
  ctx.strokeRect(10, 10, 120, 50);

  ctx.fillStyle = "#00ff88";
  ctx.font = "bold 12px 'JetBrains Mono', monospace";
  ctx.fillText(`ROOM ${gs.roomIdx + 1}/3`, 20, 30);
  ctx.fillText(`XP: ${gs.sessionXp}`, 20, 50);

  // Event Logs (Bottom Left)
  ctx.font = "10px 'JetBrains Mono', monospace";
  gs.logs.forEach((log, i) => {
    const age = (Date.now() - log.time) / 1000;
    const alpha = Math.max(0, 1 - age / 4);
    if (alpha <= 0) return;
    ctx.fillStyle = log.color;
    ctx.globalAlpha = alpha;
    ctx.fillText(`> ${log.text}`, 20, CH - 20 - i * 15);
  });
  ctx.globalAlpha = 1.0;
}
