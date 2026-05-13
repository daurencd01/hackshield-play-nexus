import { GS, CW, CH, WALL } from './useGameState';
import { GameObject } from '@/data/roomGenerator';
import { 
  drawFirewall, drawDatabase, drawCamera, drawLaserTrap, drawTurret, 
  drawHealthPack, drawKeyCard, drawDataChip, drawEnergyCell, 
  drawLockedDoor, drawServerRack, drawMonitor, drawWarningSign,
  drawGuard, drawHidingSpot, drawHoloTag, drawAlarmEffect
} from '../game2d/Renderers';

export const P_SIZE = 18;

export const C = {
  floor: "#0d1117", floorLine: "#141c2e",
  wall: "#1a2235", wallBorder: "#00ff88",
  player: "#00ff88", playerGlow: "rgba(0,255,136,0.5)",
  boxIdle: "#6b46c1", boxBorder: "#a78bfa",
  boxDone: "#166534", boxDoneBdr: "#00ff88",
  doorLocked: "#7f1d1d", doorBorderLocked: "#ef4444",
  doorOpen: "#014421", doorBorderOpen: "#00ff88",
  hint: "#ffffff", hintBg: "rgba(0,255,136,0.3)",
  xp: "#facc15",
};

export interface LogLine {
  text: string;
  color: string;
  time: number;
  id: number;
}

export function interpolateColor(c1: string, c2: string, f: number) {
  const r1 = parseInt(c1.slice(1, 3), 16), g1 = parseInt(c1.slice(3, 5), 16), b1 = parseInt(c1.slice(5, 7), 16);
  const r2 = parseInt(c2.slice(1, 3), 16), g2 = parseInt(c2.slice(3, 5), 16), b2 = parseInt(c2.slice(5, 7), 16);
  const r = Math.round(r1 + (r2 - r1) * f);
  const g = Math.round(g1 + (g2 - g1) * f);
  const b = Math.round(b1 + (b2 - b1) * f);
  return `rgb(${r},${g},${b})`;
}

export function renderObjects(
  ctx: CanvasRenderingContext2D, dpr: number,
  g: GS, t: number, dt: number
) {
  ctx.save(); ctx.scale(dpr, dpr);
  
  g.objects.forEach((obj, i) => {
    const near = g.nearbyIdx === i;
    const px = g.playerRender.x;
    const py = g.playerRender.y;

    switch (obj.type) {
      case 'terminal':
      case 'safe':
      case 'router': {
        const objPulse = 0.5 + 0.5 * Math.sin(t * 3);
        const border = obj.completed ? C.boxDoneBdr : C.boxBorder;
        const bg     = obj.completed ? C.boxDone    : C.boxIdle;
        ctx.shadowColor = border; 
        ctx.shadowBlur = near ? 25 + objPulse * 12 : 12 + objPulse * 4;
        ctx.fillStyle = bg;   
        ctx.fillRect(obj.x, obj.y, obj.w || obj.width, obj.h || obj.height);
        ctx.strokeStyle = border; 
        ctx.lineWidth = near ? 2.5 : 1.5;
        ctx.strokeRect(obj.x+.5, obj.y+.5, (obj.w || obj.width)-1, (obj.h || obj.height)-1);
        ctx.shadowBlur = 0;
        
        if (Math.sin(t * 3) > 0.95) {
          const offset = (Math.random() - 0.5) * 8;
          ctx.globalCompositeOperation = 'screen';
          ctx.fillStyle = 'rgba(255, 0, 100, 0.5)';
          ctx.fillRect(obj.x + offset, obj.y, obj.w || obj.width, obj.h || obj.height);
          ctx.fillStyle = 'rgba(0, 200, 255, 0.5)';
          ctx.fillRect(obj.x - offset, obj.y, obj.w || obj.width, obj.h || obj.height);
          ctx.globalCompositeOperation = 'source-over';
        }
        ctx.fillStyle = obj.completed ? "#00ff88" : "#c4b5fd";
        ctx.font = "bold 8px 'Orbitron', sans-serif"; ctx.textAlign = "center";
        ctx.fillText(obj.completed ? "SECURED" : obj.type.toUpperCase(), obj.x+(obj.w || obj.width)/2, obj.y+(obj.h || obj.height)-6);
        ctx.textAlign = "left";
        break;
      }
      case 'firewall': drawFirewall(ctx, obj, t); break;
      case 'database': drawDatabase(ctx, obj, t); break;
      case 'camera': drawCamera(ctx, obj, t); break;
      case 'guard': drawGuard(ctx, obj, t); break;
      case 'hiding_spot': drawHidingSpot(ctx, obj); break;
      case 'laser_trap': drawLaserTrap(ctx, obj, t); break;
      case 'turret': drawTurret(ctx, obj, t, px, py); break;
      case 'health_pack': drawHealthPack(ctx, obj, t); break;
      case 'key_card': drawKeyCard(ctx, obj, t); break;
      case 'data_chip': drawDataChip(ctx, obj, t); break;
      case 'energy_cell': drawEnergyCell(ctx, obj, t); break;
      case 'locked_door': drawLockedDoor(ctx, obj, g.hasKeyCard, t); break;
      case 'server_rack': drawServerRack(ctx, obj, t); break;
      case 'monitor': drawMonitor(ctx, obj, t); break;
      case 'warning_sign': drawWarningSign(ctx, obj, t); break;
      case 'door':
        const anim = obj.completed ? g.doorOpenAnim : 0;
        const bgDoor = interpolateColor(C.doorLocked, C.doorOpen, anim);
        const borderDoor = interpolateColor(C.doorBorderLocked, C.doorBorderOpen, anim);
        ctx.fillStyle = bgDoor; ctx.fillRect(obj.x, obj.y, obj.w || obj.width, obj.h || obj.height);
        ctx.strokeStyle = borderDoor; ctx.lineWidth = obj.completed ? 3 : 2;
        ctx.strokeRect(obj.x+.5, obj.y+.5, (obj.w || obj.width)-1, (obj.h || obj.height)-1);
        break;
      default: break;
    }

    if (near && obj.interactive && !obj.completed && !g.modalOpen) {
      const label = obj.type === 'camera' ? 'INTERCEPT [E]' : 'HACK [E]';
      drawHoloTag(ctx, obj, label, t);
    }
  });
  
  if (g.bullets && g.bullets.length > 0) {
    g.bullets.forEach(b => {
      const glow = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, 6);
      glow.addColorStop(0, '#ff8800'); glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow; ctx.fillRect(b.x - 6, b.y - 6, 12, 12);
      ctx.fillStyle = '#ffff00'; ctx.fillRect(b.x - 1, b.y - 1, 3, 3);
    });
  }
  
  ctx.restore();
}

export function renderPlayer(
  ctx: CanvasRenderingContext2D, dpr: number,
  g: GS, t: number, dt: number
) {
  const pos = g.playerRender;
  const dir = g.playerDir;
  const moving = g.playerMoving;
  
  ctx.save(); ctx.scale(dpr, dpr);
  
  // Draw Trail
  g.trail.forEach(tr => {
    const alpha = tr.alpha * 0.5;
    const size = tr.alpha * P_SIZE * 0.8;
    ctx.fillStyle = `rgba(0, 255, 136, ${alpha})`;
    ctx.fillRect(tr.x - size / 2, tr.y - size / 2, size, size);
  });

  if (g.nearbyIdx !== null) {
    for (let i = 0; i < 3; i++) {
      const phase = (t * 1.5 + i * 0.5) % 1;
      const radius = 20 + phase * 40;
      const alpha = (1 - phase) * 0.4;
      ctx.strokeStyle = `rgba(0, 255, 136, ${alpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  const pulse  = 0.5 + 0.5 * Math.sin(t * 5);
  const scale  = moving ? 1 + 0.04 * Math.sin(t * 10) : 1;

  ctx.translate(pos.x, pos.y);
  ctx.scale(scale, scale);

  const color = g.isCrouching ? '#8b5cf6' : C.player;
  const size = g.isCrouching ? P_SIZE * 0.7 : P_SIZE;

  ctx.shadowColor = color; ctx.shadowBlur = (g.isCrouching ? 8 : 12) + pulse * 10;
  ctx.fillStyle = color;
  ctx.fillRect(-size/2, -size/2, size, size);
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.fillRect(-P_SIZE/2+3, -P_SIZE/2+3, P_SIZE-6, P_SIZE-6);
  ctx.shadowBlur = 0; ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.arc(0, 0, 2, 0, Math.PI*2); ctx.fill();

  if (moving || dir.x !== 0 || dir.y !== 0) {
    const angle = Math.atan2(dir.y, dir.x);
    ctx.save(); ctx.rotate(angle);
    ctx.fillStyle = C.player; ctx.shadowColor = C.player; ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(P_SIZE/2 + 5, 0);
    ctx.lineTo(P_SIZE/2 + 1, -3);
    ctx.lineTo(P_SIZE/2 + 1,  3);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

export function renderHUD(
  ctx: CanvasRenderingContext2D, dpr: number,
  roomIdx: number, total: number, xp: number, t: number,
  health: number, maxHealth: number, hasKeyCard: boolean
) {
  ctx.save(); ctx.scale(dpr, dpr);
  
  // XP + Progress
  ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(10, 10, 160, 44);
  ctx.strokeStyle = "#00ff88"; ctx.lineWidth = 1; ctx.strokeRect(10, 10, 160, 44);
  
  ctx.fillStyle = "#00ff88"; ctx.font = "bold 12px 'Orbitron', sans-serif";
  ctx.fillText(`ROOM ${roomIdx+1}/${total}`, 20, 28);
  ctx.fillStyle = C.xp; ctx.fillText(`XP: ${xp}`, 20, 46);

  // Health bar
  const hw = 120, hh = 12;
  const hx = CW - hw - 20, hy = 20;
  ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(hx, hy, hw, hh);
  ctx.strokeStyle = health < 30 ? "#ff4444" : "#00ff88";
  ctx.strokeRect(hx, hy, hw, hh);
  ctx.fillStyle = health < 30 ? "#7f1d1d" : "#065f46";
  ctx.fillRect(hx, hy, (health / maxHealth) * hw, hh);
  ctx.fillStyle = "#fff"; ctx.font = "bold 9px monospace";
  ctx.fillText(`HEALTH: ${Math.round(health)}%`, hx + 5, hy + 9);

  // Keycard icon
  if (hasKeyCard) {
    ctx.fillStyle = "#facc15"; ctx.font = "16px sans-serif";
    ctx.fillText("💳", CW - 40, hy + 30);
  }

  ctx.restore();
}
