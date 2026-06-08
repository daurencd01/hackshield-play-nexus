import { GS, CW, CH, WALL, GameObject, Laser } from './constants';

export const INTERACT_DIST = 50;

export const SFX = {
  success: (gs: GS) => playBeep(gs, 880, 0.1, "sine", 0.1),
  error: (gs: GS) => playBeep(gs, 150, 0.2, "sawtooth", 0.1),
  interact: (gs: GS) => playBeep(gs, 784, 0.05, "sine", 0.05),
  pickup: (gs: GS) => playBeep(gs, 600, 0.1, "sine", 0.05),
  damage: (gs: GS) => playBeep(gs, 100, 0.1, "sawtooth", 0.15)
};

export function addLog(gs: GS, text: string, color: string = "#fff") {
  gs.logs.unshift({ text, color, time: Date.now() });
  if (gs.logs.length > 5) gs.logs.pop();
}

function playBeep(gs: GS, freq: number, dur: number, type: OscillatorType = "square", vol = 0.08) {
  try {
    if (!gs.audioCtx) {
      gs.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = gs.audioCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + dur);
  } catch { }
}

export function updatePhysics(gs: GS, dt: number) {
  if (gs.showQuiz || gs.transitioning) return;

  // 1. Movement & Sliding Collision
  const speed = 180;
  let vx = 0;
  let vy = 0;
  if (gs.keys.up) vy -= 1;
  if (gs.keys.down) vy += 1;
  if (gs.keys.left) vx -= 1;
  if (gs.keys.right) vx += 1;

  if (vx !== 0 || vy !== 0) {
    const mag = Math.hypot(vx, vy);
    vx = (vx / mag) * speed;
    vy = (vy / mag) * speed;
    gs.playerDir = { x: vx / speed, y: vy / speed };
  }

  // Try X movement
  const nextX = gs.playerPos.x + vx * dt;
  if (!checkCollision(gs, nextX, gs.playerPos.y)) {
    gs.playerPos.x = nextX;
  }
  
  // Try Y movement
  const nextY = gs.playerPos.y + vy * dt;
  if (!checkCollision(gs, gs.playerPos.x, nextY)) {
    gs.playerPos.y = nextY;
  }

  // 2. Laser Damage
  gs.lasers.forEach(laser => {
    if (!laser.active) return;
    const d = distToSegment(gs.playerPos.x, gs.playerPos.y, laser.x1, laser.y1, laser.x2, laser.y2);
    if (d < 15) {
      gs.playerHealth -= laser.damage * dt;
      if (Math.random() > 0.8) SFX.damage(gs);
    }
  });

  // 3. Health Regen
  if (gs.playerHealth < gs.playerMaxHealth) {
    gs.playerHealth = Math.min(gs.playerMaxHealth, gs.playerHealth + 0.02 * 60 * dt);
  }

  // 4. Death & Respawn
  if (gs.playerHealth <= 0) {
    handleDeath(gs);
  }

  // 5. Interaction Check
  updateInteraction(gs, dt);

  // 6. Particles
  updateParticles(gs, dt);
}

function checkCollision(gs: GS, x: number, y: number): boolean {
  const r = 12; // player radius
  // Wall collision
  if (x < WALL + r || x > CW - WALL - r || y < WALL + r || y > CH - WALL - r) return true;

  // Object collision
  for (const obj of gs.gameObjects) {
    if (obj.type === 'wall' || obj.type === 'server' || obj.type === 'firewall') {
      if (x + r > obj.x && x - r < obj.x + obj.width && y + r > obj.y && y - r < obj.y + obj.height) {
        return true;
      }
    }
  }
  return false;
}

function updateInteraction(gs: GS, dt: number) {
  let closest: GameObject | null = null;
  let minDist = INTERACT_DIST;

  gs.gameObjects.forEach(obj => {
    if (obj.completed && obj.type !== 'exit_portal') return;
    const dx = gs.playerPos.x - (obj.x + obj.width / 2);
    const dy = gs.playerPos.y - (obj.y + obj.height / 2);
    const d = Math.hypot(dx, dy);
    if (d < minDist) {
      minDist = d;
      closest = obj;
    }
  });

  gs.nearObject = closest;
  if (gs.interactCooldown > 0) gs.interactCooldown -= dt;
}

function handleDeath(gs: GS) {
  gs.playerHealth = gs.playerMaxHealth;
  gs.sessionXp = Math.max(0, gs.sessionXp - 10);
  gs.playerPos = { x: WALL + 40, y: CH / 2 };
  gs.playerRender = { ...gs.playerPos };
  gs.glitchEffect = 1.0;
  SFX.error(gs);
  addLog(gs, "SYSTEM REBOOTED", "#ff3366");
  addLog(gs, "-10 XP PENALTY", "#ff3366");
}

function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const l2 = (x1 - x2) ** 2 + (y1 - y2) ** 2;
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
}

export function spawnParticles(gs: GS, x: number, y: number, color: string, count = 8) {
  for (let i = 0; i < count; i++) {
    const ang = Math.random() * Math.PI * 2;
    const spd = 50 + Math.random() * 150;
    gs.particles.push({
      x, y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      life: 0.5 + Math.random() * 0.5,
      color,
      size: 2 + Math.random() * 3
    });
  }
}

function updateParticles(gs: GS, dt: number) {
  for (let i = gs.particles.length - 1; i >= 0; i--) {
    const p = gs.particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    if (p.life <= 0) gs.particles.splice(i, 1);
  }
}
