import { GS, CW, CH, WALL, Bullet, Particle } from './useGameState';
import { GameObject } from '@/data/roomGenerator';

export const INTERACT_DIST = 45;
export const INTERACT_COOLDOWN = 0.5;

export const SFX = {
  success: (gs: GS) => {
    playBeep(gs, 880, 0.1, "sine", 0.1);
    setTimeout(() => playBeep(gs, 1320, 0.15, "sine", 0.08), 80);
  },
  error: (gs: GS) => {
    playBeep(gs, 150, 0.1, "sawtooth", 0.06);
    setTimeout(() => playBeep(gs, 110, 0.2, "sawtooth", 0.05), 50);
  },
  doorOpen: (gs: GS) => {
    playBeep(gs, 440, 0.05, "square", 0.04);
    setTimeout(() => playBeep(gs, 660, 0.1, "sine", 0.05), 40);
  },
  interact: (gs: GS) => playBeep(gs, 784, 0.05, "sine", 0.04),
  click: (gs: GS) => playBeep(gs, 1200, 0.02, "sine", 0.03),
  pickup: (gs: GS) => {
    playBeep(gs, 600, 0.1, "sine", 0.05);
    setTimeout(() => playBeep(gs, 800, 0.1, "sine", 0.05), 50);
  },
  hit: (gs: GS) => {
    playBeep(gs, 100, 0.2, "sawtooth", 0.1);
  },
  failure: (gs: GS) => {
    playBeep(gs, 200, 0.1, "square", 0.08);
  }
};

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

export function addLog(gs: GS, text: string, color: string) {
  gs.logs.unshift({ text, color, time: Date.now(), id: Math.random() });
  if (gs.logs.length > 5) gs.logs.pop();
}

export function spawnHackEffect(gs: GS, obj: GameObject) {
  const x = obj.x + (obj.width / 2);
  const y = obj.y + (obj.height / 2);
  gs.hackEffects.push({ x, y, life: 1, color: "#00ff88" });
  spawnParticle(gs, x, y, "#00ff88");
}

export function updateStealth(gs: GS, dt: number, now: number) {
  const p = gs.playerRender;
  const isCrouching = gs.isCrouching;

  // Check if player is in a hiding spot
  let inHiding = false;
  gs.objects.forEach(obj => {
    if (obj.type === 'hiding_spot') {
      const dx = p.x - (obj.x + obj.width / 2);
      const dy = p.y - (obj.y + obj.height / 2);
      if (Math.hypot(dx, dy) < obj.width / 2) inHiding = true;
    }
  });

  gs.objects.forEach(obj => {
    if (obj.type === 'camera' && !obj.hacked) {
      // Camera patrol rotation
      const period = obj.period || 4;
      const range = obj.range || Math.PI / 2;
      const base = obj.baseAngle || 0;
      obj.rotationAngle = base + Math.sin(now * (2 * Math.PI / period) + (obj.animPhase || 0)) * (range / 2);

      // Detection logic
      const dx = p.x - (obj.x + obj.width / 2);
      const dy = p.y - (obj.y + obj.height / 2);
      const dist = Math.hypot(dx, dy);
      const coneRange = obj.detectionCone?.range || 150;

      if (dist < coneRange && !inHiding) {
        const angleToPlayer = Math.atan2(dy, dx);
        let diff = Math.abs(angleToPlayer - (obj.rotationAngle || 0));
        while (diff > Math.PI) diff = Math.abs(diff - 2 * Math.PI);

        const coneAngle = obj.detectionCone?.angle || Math.PI / 3;
        if (diff < coneAngle / 2) {
          // Detected!
          const speed = isCrouching ? 20 : 50;
          obj.detectionLevel = Math.min(100, (obj.detectionLevel || 0) + speed * dt);
          obj.detectionState = obj.detectionLevel > 80 ? 'detected' : 'suspicious';
          if (obj.detectionLevel >= 100 && !gs.alarmActive) {
            triggerAlarm(gs, obj.id);
          }
        } else {
          decayDetection(obj, dt);
        }
      } else {
        decayDetection(obj, dt);
      }
    }
  });

  // Guard AI
  if (gs.alarmActive) {
    gs.objects.forEach(obj => {
      if (obj.type === 'guard') {
        const dx = p.x - obj.x;
        const dy = p.y - obj.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 5) {
          const vx = (dx / dist) * 110;
          const vy = (dy / dist) * 110;
          obj.x += vx * dt;
          obj.y += vy * dt;
        }
        obj.targetX = p.x;
        obj.targetY = p.y;
        obj.state = 'chasing';

        if (dist < 20) {
          catchPlayer(gs);
        }
      }
    });
  }
}

function decayDetection(obj: GameObject, dt: number) {
  obj.detectionLevel = Math.max(0, (obj.detectionLevel || 0) - 15 * dt);
  if (obj.detectionLevel === 0) obj.detectionState = 'idle';
  else if (obj.detectionLevel < 50) obj.detectionState = 'suspicious';
}

export function triggerAlarm(gs: GS, camId: string) {
  if (gs.alarmActive) return;
  gs.alarmActive = true;
  gs.alarmCamera = camId;
  gs.screenFlash = { color: "#ff0000", alpha: 0.4, fadeTime: 1 };
  
  // Spawn guards
  for (let i = 0; i < 2; i++) {
    gs.objects.push({
      id: `guard_alarm_${i}`,
      type: 'guard',
      x: i === 0 ? 0 : CW,
      y: CH / 2,
      width: 24,
      height: 24,
      state: 'chasing'
    });
  }
}

export function catchPlayer(gs: GS) {
  gs.health = Math.max(20, gs.health - 40);
  gs.sessionXp = Math.max(0, gs.sessionXp - 30);
  gs.transitioning = true;
  gs.screenFlash = { color: "#ff0000", alpha: 0.8, fadeTime: 2 };
  gs.glitchEffect = 1.0;

  setTimeout(() => {
    gs.playerTarget = gs.playerRender = { x: WALL + 40, y: CH / 2 };
    gs.alarmActive = false;
    gs.objects = gs.objects.filter(o => o.type !== 'guard');
    gs.objects.forEach(o => {
      if (o.type === 'camera') {
        o.detectionLevel = 0;
        o.detectionState = 'idle';
      }
    });
    gs.transitioning = false;
  }, 1000);
}

export function spawnParticle(gs: GS, x: number, y: number, color: string) {
  for (let i = 0; i < 8; i++) {
    const ang = Math.random() * Math.PI * 2;
    const spd = 50 + Math.random() * 100;
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

export function updateParticles(gs: GS, dt: number) {
  for (let i = gs.particles.length - 1; i >= 0; i--) {
    const p = gs.particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    if (p.life <= 0) gs.particles.splice(i, 1);
  }
}
