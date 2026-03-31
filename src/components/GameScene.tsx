/**
 * GameScene.tsx — Polished 2D top-down cyber training game
 * Architecture: RAF loop in refs · React state only for JSX · no heavy libs
 */
import { useEffect, useRef, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Terminal, ChevronRight, CheckCircle, XCircle,
  RotateCcw, Loader2, X, Award, Keyboard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { addXp } from "@/hooks/useUser";

// ─── Constants ────────────────────────────────────────────────────────────────
const XP_PER_ROOM  = 50;
const CW           = 640;   // canvas logical width
const CH           = 400;   // canvas logical height
const WALL         = 24;
const P_SIZE       = 18;    // player half-size
const P_SPEED      = 180;   // px / sec
const P_LERP       = 14;    // smoothing factor (higher = snappier)
const BOX_W = 40, BOX_H = 36;
const DOOR_W = 20, DOOR_H = 56;
const INTERACT_DIST = 68;
const INTERACT_COOLDOWN = 0.5; // seconds

const C = {
  floor:"#0d1117", floorLine:"#141c2e",
  wall:"#1a2235",  wallBorder:"#00ff88",
  player:"#00ff88", playerGlow:"rgba(0,255,136,0.5)",
  boxIdle:"#6b46c1", boxBorder:"#a78bfa",
  boxDone:"#166534", boxDoneBdr:"#00ff88",
  doorLocked:"#7f1d1d", doorBorderLocked:"#ef4444",
  doorOpen:"#014421",  doorBorderOpen:"#00ff88",
  hint:"#ffffff", hintBg:"rgba(0,255,136,0.3)",
  xp:"#facc15",
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface ScenarioRoom {
  id: string; mission_id: string; title: string;
  task: string; correct_answer: string; order_index: number;
}
type AnswerState = "idle" | "submitting" | "correct" | "wrong";
type Keys = { up:boolean; down:boolean; left:boolean; right:boolean };
interface Vec2 { x:number; y:number }
interface GameObj {
  x:number; y:number; w:number; h:number;
  type:"box"|"door"; completed:boolean;
}

export interface GameSceneProps {
  missionId: string; userId: string;
  onComplete: (totalXp: number) => void;
}

// ─── Mutable game state (ref — zero re-renders) ───────────────────────────────
interface GS {
  // player
  playerTarget: Vec2;      // where keys push it
  playerRender: Vec2;      // smoothly interpolated position
  playerDir: Vec2;         // normalised direction vector
  playerMoving: boolean;
  // input
  keys: Keys;
  interactCooldown: number;
  // world
  objects: GameObj[];
  nearbyIdx: number | null;
  hintAlpha: number;       // 0→1 fade for [E] label
  doorOpenAnim: number;    // 0→1 door unlock animation
  // loop
  rafId: number;
  lastTime: number;
  // state flags
  modalOpen: boolean;
  transitionAlpha: number;
  transitioning: boolean;
  // sound
  audioCtx: AudioContext | null;
}

// ─── Sound helpers (HTML5 Web Audio, no external lib) ─────────────────────────
function getAudio(gs: GS): AudioContext {
  if (!gs.audioCtx) {
    gs.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return gs.audioCtx;
}
function playBeep(gs: GS, freq: number, dur: number, type: OscillatorType = "square", vol = 0.08) {
  try {
    const ctx = getAudio(gs);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + dur);
  } catch {}
}
const SFX = {
  success:  (gs: GS) => { 
    playBeep(gs, 880, 0.1, "sine", 0.1); 
    setTimeout(() => playBeep(gs, 1320, 0.15, "sine", 0.08), 80); 
  },
  error:    (gs: GS) => {
    playBeep(gs, 150, 0.1, "sawtooth", 0.06);
    setTimeout(() => playBeep(gs, 110, 0.2, "sawtooth", 0.05), 50);
  },
  doorOpen: (gs: GS) => { 
    playBeep(gs, 440, 0.05, "square", 0.04); 
    setTimeout(() => playBeep(gs, 660, 0.1, "sine", 0.05), 40); 
  },
  interact: (gs: GS) => playBeep(gs, 784, 0.05, "sine", 0.04), // G5 note
  click: (gs: GS) => playBeep(gs, 1200, 0.02, "sine", 0.03),
};

// ─── Build room objects ───────────────────────────────────────────────────────
function buildObjects(): GameObj[] {
  return [
    { x: CW/2 - BOX_W/2, y: CH/2 + 30, w: BOX_W, h: BOX_H, type:"box", completed:false },
    { x: CW - WALL - DOOR_W, y: CH/2 - DOOR_H/2, w: DOOR_W, h: DOOR_H, type:"door", completed:false },
  ];
}

// ─── Normalize answer ─────────────────────────────────────────────────────────
function norm(v: string) { return v.trim().toLowerCase(); }

// ═════════════════════════════════════════════════════════════════════════════
// RENDERERS — pure canvas functions, no React
// ═════════════════════════════════════════════════════════════════════════════

function renderRoom(ctx: CanvasRenderingContext2D, dpr: number) {
  ctx.save(); ctx.scale(dpr, dpr);
  // floor
  ctx.fillStyle = C.floor;
  ctx.fillRect(0, 0, CW, CH);
  // grid
  ctx.strokeStyle = C.floorLine; ctx.lineWidth = 0.5;
  for (let x = WALL; x < CW - WALL; x += 32) {
    ctx.beginPath(); ctx.moveTo(x, WALL); ctx.lineTo(x, CH-WALL); ctx.stroke();
  }
  for (let y = WALL; y < CH - WALL; y += 32) {
    ctx.beginPath(); ctx.moveTo(WALL, y); ctx.lineTo(CW-WALL, y); ctx.stroke();
  }
  // walls
  ctx.fillStyle = C.wall;
  ctx.fillRect(0, 0, CW, WALL); ctx.fillRect(0, CH-WALL, CW, WALL);
  ctx.fillRect(0, 0, WALL, CH); ctx.fillRect(CW-WALL, 0, WALL, CH);
  // inner border
  ctx.strokeStyle = C.wallBorder; ctx.lineWidth = 1;
  ctx.strokeRect(WALL+.5, WALL+.5, CW-WALL*2-1, CH-WALL*2-1);
  // corners
  ctx.strokeStyle = "rgba(0,255,136,0.4)";
  [[WALL+4,WALL+4],[CW-WALL-4,WALL+4],[WALL+4,CH-WALL-4],[CW-WALL-4,CH-WALL-4]].forEach(([cx,cy]) => {
    ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI*2); ctx.stroke();
  });
  // scanlines
  for (let y = 0; y < CH; y += 4) {
    ctx.fillStyle = "rgba(0,0,0,0.06)"; ctx.fillRect(0, y, CW, 2);
  }
  ctx.restore();
}

function renderObjects(
  ctx: CanvasRenderingContext2D, dpr: number,
  objects: GameObj[], nearbyIdx: number|null,
  hintAlpha: number, doorOpenAnim: number, t: number,
) {
  ctx.save(); ctx.scale(dpr, dpr);
  const pulse = 0.5 + 0.5 * Math.sin(t * 3);

  objects.forEach((obj, i) => {
    const near = nearbyIdx === i;

    if (obj.type === "box") {
      const border = obj.completed ? C.boxDoneBdr : C.boxBorder;
      const bg     = obj.completed ? C.boxDone    : C.boxIdle;
      
      // Floating box shadow
      ctx.shadowColor = border; 
      ctx.shadowBlur = near ? 25 + pulse * 12 : 12 + pulse * 4;
      
      ctx.fillStyle = bg;   
      ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
      
      ctx.strokeStyle = border; 
      ctx.lineWidth = near ? 2.5 : 1.5;
      ctx.strokeRect(obj.x+.5, obj.y+.5, obj.w-1, obj.h-1);
      ctx.shadowBlur = 0;

      // Terminal lines animation
      const linePulse = 0.7 + 0.3 * Math.sin(t * 4 + i);
      ctx.strokeStyle = obj.completed ? `rgba(0,255,136,${linePulse})` : `rgba(167,139,250,${linePulse})`;
      ctx.lineWidth = 2;
      const mx = obj.x + obj.w/2, ty = obj.y + 10;
      [[mx-10,ty,mx+10,ty],[mx-10,ty+8,mx+2,ty+8],[mx-10,ty+16,mx+6,ty+16]].forEach(([x1,y1,x2,y2]) => {
        ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
      });
      
      ctx.fillStyle = obj.completed ? "#00ff88" : "#c4b5fd";
      ctx.font = "bold 8px 'Orbitron', sans-serif"; ctx.textAlign = "center";
      ctx.fillText(obj.completed ? "SECURED" : "TERMINAL", obj.x+obj.w/2, obj.y+obj.h-6);

    } else {
      // Door — animate unlock
      const anim    = obj.completed ? doorOpenAnim : 0;
      const border  = interpolateColor(C.doorBorderLocked, C.doorBorderOpen, anim);
      const bg      = interpolateColor(C.doorLocked, C.doorOpen, anim);
      
      // Scale and glow animation for door
      const doorScale = 1 + (obj.completed ? 0.02 * Math.sin(t * 4) : 0);
      ctx.save();
      ctx.translate(obj.x + obj.w/2, obj.y + obj.h/2);
      ctx.scale(doorScale, doorScale);
      ctx.translate(-(obj.x + obj.w/2), -(obj.y + obj.h/2));

      ctx.shadowColor = border; 
      ctx.shadowBlur = near ? 30 : (obj.completed ? 20 + pulse*10 : 8);
      
      // door frame shadow
      ctx.fillStyle = "#1a2235"; 
      ctx.fillRect(obj.x-4, obj.y-4, obj.w+8, obj.h+8);
      
      ctx.fillStyle = bg; 
      ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
      
      ctx.strokeStyle = border; 
      ctx.lineWidth = obj.completed ? 3 : 2;
      ctx.strokeRect(obj.x+.5, obj.y+.5, obj.w-1, obj.h-1);
      ctx.shadowBlur = 0;

      // door text/icon
      const dx = obj.x + obj.w/2;
      if (!obj.completed) {
        ctx.strokeStyle = "rgba(239,68,68,0.8)"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(dx, obj.y+obj.h/2-6, 6, Math.PI, 0); ctx.stroke();
        ctx.fillStyle = "rgba(239,68,68,0.5)"; ctx.fillRect(dx-6, obj.y+obj.h/2-6, 12, 10);
      } else {
        ctx.globalAlpha = Math.min(doorOpenAnim * 2, 1);
        ctx.strokeStyle = "#00ff88"; ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(dx-5, obj.y+obj.h/2); ctx.lineTo(dx+5, obj.y+obj.h/2);
        ctx.moveTo(dx+1, obj.y+obj.h/2-5); ctx.lineTo(dx+6, obj.y+obj.h/2);
        ctx.lineTo(dx+1, obj.y+obj.h/2+5);
        ctx.stroke(); 
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    }

    // [E] hint with floating label and fade
    if (near && hintAlpha > 0) {
      const floatY = Math.sin(t * 6) * 4;
      const hx = obj.x + obj.w/2, hy = obj.y - 25 + floatY;
      const hw = 70, hh = 18;
      
      ctx.globalAlpha = hintAlpha;
      // Background bubble
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.strokeStyle = C.wallBorder;
      ctx.lineWidth = 1.5;
      ctx.roundRect(hx-hw/2, hy-hh, hw, hh, 4);
      ctx.fill(); ctx.stroke();
      
      // Text
      ctx.fillStyle = "#fff";
      ctx.font = "bold 10px 'Orbitron', sans-serif"; 
      ctx.textAlign = "center";
      ctx.fillText("[E] ACCESS", hx, hy - 6);
      ctx.globalAlpha = 1;
    }
  });
  ctx.restore();
}

function renderPlayer(
  ctx: CanvasRenderingContext2D, dpr: number,
  pos: Vec2, dir: Vec2, moving: boolean, t: number,
) {
  ctx.save(); ctx.scale(dpr, dpr);
  const pulse  = 0.5 + 0.5 * Math.sin(t * 5);
  const scale  = moving ? 1 + 0.04 * Math.sin(t * 10) : 1;

  ctx.translate(pos.x, pos.y);
  ctx.scale(scale, scale);

  // Outer glow
  ctx.shadowColor = C.player; ctx.shadowBlur = 12 + pulse * 10;
  ctx.fillStyle = C.player;
  ctx.fillRect(-P_SIZE/2, -P_SIZE/2, P_SIZE, P_SIZE);
  // inner dark
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.fillRect(-P_SIZE/2+3, -P_SIZE/2+3, P_SIZE-6, P_SIZE-6);
  // center dot
  ctx.shadowBlur = 0; ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.arc(0, 0, 2, 0, Math.PI*2); ctx.fill();

  // Direction arrow — rotates with movement
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

function renderHUD(
  ctx: CanvasRenderingContext2D, dpr: number,
  roomIdx: number, total: number, xp: number, t: number,
) {
  ctx.save(); ctx.scale(dpr, dpr);
  
  // HUD Background bars
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(10, 10, 120, 24);
  
  ctx.strokeStyle = "rgba(0,255,136,0.3)";
  ctx.lineWidth = 1;
  ctx.strokeRect(10.5, 10.5, 120, 24);

  // Room Info
  ctx.font = "bold 10px 'Orbitron', sans-serif";
  ctx.fillStyle = "#00ff88"; ctx.textAlign = "left";
  ctx.fillText(`PHASE ${roomIdx+1} / ${total}`, 18, 26);
  
  // XP Display (Top right)
  const xpX = CW - 20;
  ctx.textAlign = "right";
  
  // XP Pulse on change could be added, but here's a subtle float
  const xpY = 26 + Math.sin(t * 2) * 1;
  ctx.fillStyle = C.xp;
  ctx.shadowColor = C.xp; ctx.shadowBlur = 10;
  ctx.fillText(`${xp} XP`, xpX, xpY);
  ctx.shadowBlur = 0;

  ctx.restore();
}

function renderMinimap(
  ctx: CanvasRenderingContext2D, dpr: number,
  total: number, current: number,
) {
  ctx.save(); ctx.scale(dpr, dpr);
  
  const mapW = 120;
  const mapH = 30;
  const startX = CW - mapW - 10;
  const startY = 45;
  
  // Minimap container
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.fillRect(startX, startY, mapW, mapH);
  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.strokeRect(startX + 0.5, startY + 0.5, mapW, mapH);

  const nodeR = 4;
  const padding = 15;
  const spacing = (mapW - padding * 2) / Math.max(total - 1, 1);
  const midY = startY + mapH / 2;

  for (let i = 0; i < total; i++) {
    const nx = startX + padding + i * spacing;
    
    // Connections
    if (i < total - 1) {
      const nextX = startX + padding + (i + 1) * spacing;
      ctx.beginPath();
      ctx.moveTo(nx + nodeR, midY);
      ctx.lineTo(nextX - nodeR, midY);
      ctx.strokeStyle = i < current ? "#00ff88" : "rgba(255,255,255,0.1)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    
    // Nodes
    ctx.beginPath();
    ctx.arc(nx, midY, nodeR, 0, Math.PI * 2);
    
    if (i < current) {
      ctx.fillStyle = "#00ff88";
      ctx.fill();
    } else if (i === current) {
      ctx.fillStyle = "#fff";
      ctx.shadowColor = "#fff"; ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;
      // selection ring
      ctx.beginPath();
      ctx.arc(nx, midY, nodeR + 3, 0, Math.PI * 2);
      ctx.strokeStyle = "#00ff88";
      ctx.lineWidth = 1;
      ctx.stroke();
    } else {
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.fill();
    }
  }
  
  ctx.restore();
}

function renderFade(ctx: CanvasRenderingContext2D, dpr: number, alpha: number) {
  if (alpha <= 0) return;
  ctx.save(); ctx.scale(dpr, dpr);
  ctx.fillStyle = `rgba(0,0,0,${alpha})`; ctx.fillRect(0, 0, CW, CH);
  ctx.restore();
}

// ─── Color interpolation helper ───────────────────────────────────────────────
function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return [r,g,b];
}
function interpolateColor(a: string, b: string, t: number): string {
  const [r1,g1,b1] = hexToRgb(a);
  const [r2,g2,b2] = hexToRgb(b);
  const r = Math.round(r1 + (r2-r1)*t);
  const g = Math.round(g1 + (g2-g1)*t);
  const bl = Math.round(b1 + (b2-b1)*t);
  return `rgb(${r},${g},${bl})`;
}

// ═════════════════════════════════════════════════════════════════════════════
// TaskModal
// ═════════════════════════════════════════════════════════════════════════════
interface TaskModalProps {
  room: ScenarioRoom; roomIndex: number; totalRooms: number;
  userId: string; isLast: boolean;
  onCorrect: () => void; onClose: () => void;
  onSuccess: () => void; onError: () => void;
}

function TaskModal({ room, roomIndex, totalRooms, userId, isLast, onCorrect, onClose, onSuccess, onError }: TaskModalProps) {
  const [answer, setAnswer]     = useState("");
  const [state, setState]       = useState<AnswerState>("idle");
  const [shake, setShake]       = useState(false);
  const [xpVisible, setXpVis]   = useState(false);
  const submitting = useRef(false);
  const inputRef   = useRef<HTMLInputElement>(null);

  useEffect(() => { const t = setTimeout(() => inputRef.current?.focus(), 200); return () => clearTimeout(t); }, []);
  useEffect(() => { document.body.style.overflow="hidden"; return () => { document.body.style.overflow=""; }; }, []);

  const handleSubmit = useCallback(async () => {
    if (state !== "idle" || submitting.current || !answer.trim()) return;
    submitting.current = true;
    setState("submitting");

    const ok = norm(answer) === norm(room.correct_answer);
    if (ok) {
      await Promise.allSettled([
        addXp(userId, XP_PER_ROOM),
        supabase.from("user_progress").upsert(
          { user_id:userId, mission_id:room.mission_id, current_room:roomIndex, completed:isLast },
          { onConflict:"user_id,mission_id" }
        ),
      ]);
      onSuccess();
      setXpVis(true);
      setState("correct");
    } else {
      onError();
      setState("wrong");
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
    submitting.current = false;
  }, [answer, state, room, userId, roomIndex, isLast, onSuccess, onError]);

  const retry = () => { setAnswer(""); setState("idle"); setTimeout(() => inputRef.current?.focus(), 50); };

  return (
    <motion.div
      initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget && state !== "correct") onClose(); }}
    >
      <motion.div
        initial={{ scale:0.85, y:24 }} animate={{ scale:1, y:0, x: shake ? [-8,8,-6,6,-3,3,0] : 0 }}
        exit={{ scale:0.85, y:24 }}
        transition={shake ? { x:{ duration:0.4 } } : { type:"spring", stiffness:320, damping:26 }}
        className="relative w-full max-w-lg rounded-xl border bg-[#0a0d12] shadow-2xl overflow-hidden"
        style={{
          borderColor: state === "correct" ? "rgba(0,255,136,0.6)" : state === "wrong" ? "rgba(239,68,68,0.6)" : "rgba(0,255,136,0.3)",
          boxShadow: state === "correct" ? "0 0 40px rgba(0,255,136,0.2)" : state === "wrong" ? "0 0 30px rgba(239,68,68,0.15)" : "0 0 40px rgba(0,255,136,0.1)",
        }}
      >
        {/* Scanline */}
        <div className="pointer-events-none absolute inset-0 z-10"
          style={{ background:"repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.04) 2px,rgba(0,0,0,0.04) 4px)" }} />

        {/* Green flash on success */}
        <AnimatePresence>
          {state === "correct" && (
            <motion.div
              initial={{ opacity:0.4 }} animate={{ opacity:0 }} transition={{ duration:0.5 }}
              className="pointer-events-none absolute inset-0 z-20 bg-primary/20" />
          )}
        </AnimatePresence>

        {/* Header */}
        <div className="relative flex items-center justify-between border-b border-primary/20 bg-black/40 px-4 py-3">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-primary" />
            <span className="font-orbitron text-xs font-bold uppercase tracking-widest text-primary">{room.title}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] text-muted-foreground">ROOM [{roomIndex+1}/{totalRooms}]</span>
            {state !== "correct" && (
              <button onClick={onClose} className="rounded p-1 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="relative p-5 space-y-4">
          <p className="font-mono text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">{room.task}</p>

          {/* Input */}
          {(state === "idle" || state === "submitting") && (
            <div className="space-y-2">
              <label htmlFor="ga" className="font-orbitron text-[10px] font-bold uppercase tracking-widest text-secondary">
                &gt;_ Введи команду:
              </label>
              <div className="flex gap-2">
                <input
                  id="ga" ref={inputRef} type="text" value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && state === "idle") handleSubmit(); }}
                  disabled={state === "submitting"}
                  placeholder="$ ..." autoComplete="off" spellCheck={false}
                  className="flex-1 rounded-md border border-primary/30 bg-black/60 px-3 py-2 font-mono text-sm text-primary placeholder:text-primary/30 outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all disabled:opacity-40"
                />
                <Button
                  onClick={handleSubmit} disabled={!answer.trim() || state === "submitting"}
                  className="font-orbitron text-xs uppercase bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-30"
                >
                  {state === "submitting" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}

          {/* Correct */}
          <AnimatePresence>
            {state === "correct" && (
              <motion.div 
                initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
                className="rounded-md border border-primary/40 bg-primary/10 p-4 space-y-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20">
                    <CheckCircle className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-orbitron text-sm font-bold text-primary">ACCESS GRANTED</div>
                    <div className="font-mono text-[10px] text-primary/70">Signature verified. Decryption complete.</div>
                  </div>
                  <motion.span
                    initial={{ opacity:0, scale:0.5 }} animate={{ opacity: xpVisible ? 1 : 0, scale: xpVisible ? 1 : 1.2 }}
                    className="ml-auto font-orbitron text-lg font-bold text-neon-yellow drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]"
                  >
                    +{XP_PER_ROOM} XP
                  </motion.span>
                </div>
                <Button onClick={onCorrect} className="w-full font-orbitron text-xs uppercase bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_rgba(0,255,136,0.4)] transition-all">
                  {isLast ? <><Award className="mr-2 h-4 w-4" /> Finalize Mission</> : "Proceed to Next Level ▶"}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Wrong */}
          <AnimatePresence>
            {state === "wrong" && (
              <motion.div 
                initial={{ opacity:0, x:[-10, 10, -10, 10, 0] }} animate={{ opacity:1 }}
                className="rounded-md border border-destructive/40 bg-destructive/10 p-4 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-destructive/20">
                    <XCircle className="h-4 w-4 text-destructive" />
                  </div>
                  <span className="font-orbitron text-xs font-bold text-destructive">CRITICAL ERROR: ACCESS DENIED</span>
                </div>
                <p className="font-mono text-xs text-destructive/80 pl-9">
                  Command <span className="text-destructive font-bold underline">«{answer}»</span> not recognized in current context.
                </p>
                <div className="pl-9 pt-1">
                  <Button variant="outline" onClick={retry}
                    className="h-8 font-orbitron text-[10px] uppercase border-destructive/40 text-destructive hover:bg-destructive/20 transition-all">
                    <RotateCcw className="mr-1.5 h-3 w-3" /> Re-initialize Terminal
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// D-Pad component
// ═════════════════════════════════════════════════════════════════════════════
interface DPadProps {
  onKey: (k: keyof Keys | null, down: boolean) => void;
  onInteract: () => void;
}
function DPad({ onKey, onInteract }: DPadProps) {
  const [pressed, setPressed] = useState<Record<string, boolean>>({});
  const press = (id: string, k: keyof Keys | null, down: boolean) => {
    setPressed(p => ({ ...p, [id]: down }));
    if (k) onKey(k, down); else if (down) onInteract();
  };
  const btn = (label: string | React.ReactNode, id: string, k: keyof Keys | null) => (
    <button
      key={id}
      onPointerDown={(e) => { e.preventDefault(); press(id, k, true); }}
      onPointerUp={(e) => { e.preventDefault(); press(id, k, false); }}
      onPointerCancel={(e) => { e.preventDefault(); press(id, k, false); }}
      onPointerLeave={(e) => { e.preventDefault(); press(id, k, false); }}
      className={`flex h-16 w-16 items-center justify-center rounded-2xl border-2 font-orbitron text-xl font-bold select-none transition-all touch-none active:scale-90
        ${pressed[id]
          ? "border-[#00ff88] bg-[#00ff88]/30 text-[#00ff88] shadow-[0_0_20px_rgba(0,255,136,0.4)]"
          : "border-white/10 bg-black/40 text-white/60"
        }`}
    >
      {label}
    </button>
  );
  return (
    <div className="flex items-end justify-between p-6 md:hidden pointer-events-none fixed bottom-0 left-0 right-0 z-40">
      {/* Movement */}
      <div className="grid grid-cols-3 gap-2 pointer-events-auto">
        <div /> {btn("▲", "up", "up")} <div />
        {btn("◀", "left", "left")} <div /> {btn("▶", "right", "right")}
        <div /> {btn("▼", "down", "down")} <div />
      </div>
      
      {/* Interact */}
      <div className="pointer-events-auto">
        <button
          onPointerDown={() => press("e", null, true)}
          onPointerUp={() => press("e", null, false)}
          className={`flex h-20 w-20 items-center justify-center rounded-full border-4 font-orbitron text-2xl font-black select-none transition-all touch-none active:scale-95
            ${pressed["e"]
              ? "border-[#00ff88] bg-[#00ff88]/40 text-[#00ff88] shadow-[0_0_30px_rgba(0,255,136,0.5)]"
              : "border-white/20 bg-black/60 text-white/80"
            }`}
        >
          E
        </button>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Main component
// ═════════════════════════════════════════════════════════════════════════════
export default function GameScene({ missionId, userId, onComplete }: GameSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // React state — drives JSX only
  const [phase,       setPhase]     = useState<"loading"|"playing"|"error">("loading");
  const [rooms,       setRooms]     = useState<ScenarioRoom[]>([]);
  const [roomIdx,     setRoomIdx]   = useState(0);
  const [totalXP,     setTotalXP]   = useState(0);
  const [modalOpen,   setModalOpen] = useState(false);
  const [activeType,  setActiveType]= useState<"box"|"door"|null>(null);

  // Single mutable ref — everything the game loop touches
  const gs = useRef<GS>({
    playerTarget: { x: WALL+40, y: CH/2 },
    playerRender: { x: WALL+40, y: CH/2 },
    playerDir:    { x: 1, y: 0 },
    playerMoving: false,
    keys:         { up:false, down:false, left:false, right:false },
    interactCooldown: 0,
    objects:      [],
    nearbyIdx:    null,
    hintAlpha:    0,
    doorOpenAnim: 0,
    rafId:        0,
    lastTime:     0,
    modalOpen:    false,
    transitionAlpha: 0,
    transitioning:   false,
    audioCtx:     null,
  });

  // ── Load rooms + progress ────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const [{ data: rd, error: re }, { data: pd }] = await Promise.all([
        supabase.from("scenario_rooms")
          .select("id,mission_id,title,task,correct_answer,order_index")
          .eq("mission_id", missionId).order("order_index", { ascending:true }),
        supabase.from("user_progress")
          .select("current_room,completed")
          .eq("user_id", userId).eq("mission_id", missionId).maybeSingle(),
      ]);
      if (cancelled) return;
      if (re || !rd?.length) { setPhase("error"); return; }
      const fetched = rd as ScenarioRoom[];
      const resume = pd?.completed ? 0 : pd ? Math.min(pd.current_room, fetched.length-1) : 0;
      setRooms(fetched); setRoomIdx(resume);
      gs.current.objects = buildObjects();
      gs.current.playerTarget = gs.current.playerRender = { x: WALL+40, y: CH/2 };
      gs.current.doorOpenAnim = 0;
      setPhase("playing");
    };
    load();
    return () => { cancelled = true; };
  }, [missionId, userId]);

  // ── Keyboard ─────────────────────────────────────────────────────
  useEffect(() => {
    const map: Record<string, keyof Keys> = {
      ArrowUp:"up", w:"up", W:"up",
      ArrowDown:"down", s:"down", S:"down",
      ArrowLeft:"left", a:"left", A:"left",
      ArrowRight:"right", d:"right", D:"right",
    };
    const scrollKeys = new Set(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," ","e","E"]);
    const down = (e: KeyboardEvent) => {
      if (scrollKeys.has(e.key)) e.preventDefault();
      const k = map[e.key];
      if (k) gs.current.keys[k] = true;
      if ((e.key === "e" || e.key === "E") && !gs.current.modalOpen && gs.current.interactCooldown <= 0) {
        const ni = gs.current.nearbyIdx;
        if (ni !== null) triggerInteract(ni);
      }
    };
    const up = (e: KeyboardEvent) => { const k = map[e.key]; if (k) gs.current.keys[k] = false; };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []); // eslint-disable-line

  const triggerInteract = useCallback((ni: number) => {
    SFX.interact(gs.current);
    gs.current.modalOpen = true;
    gs.current.interactCooldown = INTERACT_COOLDOWN;
    setActiveType(gs.current.objects[ni].type);
    setModalOpen(true);
  }, []);

  // ── Game loop ─────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "playing" || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const dpr    = window.devicePixelRatio || 1;
    canvas.width  = CW * dpr; canvas.height  = CH * dpr;
    canvas.style.width = `${CW}px`; canvas.style.height = `${CH}px`;
    const ctx = canvas.getContext("2d")!;
    let animT = 0;

    const tick = (now: number) => {
      const dt = Math.min((now - gs.current.lastTime) / 1000, 0.05);
      gs.current.lastTime = now;
      animT += dt;
      const g = gs.current;

      // Interaction cooldown
      if (g.interactCooldown > 0) g.interactCooldown = Math.max(0, g.interactCooldown - dt);

      if (!g.modalOpen && !g.transitioning) {
        // ── Target movement ──────────────────────────────────────
        const spd = P_SPEED * dt;
        let { x, y } = g.playerTarget;
        let dx = 0, dy = 0;
        if (g.keys.up)    { y -= spd; dy = -1; }
        if (g.keys.down)  { y += spd; dy =  1; }
        if (g.keys.left)  { x -= spd; dx = -1; }
        if (g.keys.right) { x += spd; dx =  1; }

        g.playerMoving = dx !== 0 || dy !== 0;
        if (g.playerMoving) {
          const len = Math.hypot(dx, dy) || 1;
          g.playerDir = { x: dx/len, y: dy/len };
        }

        // Wall bounds
        const half = P_SIZE / 2;
        x = Math.max(WALL+half, Math.min(CW-WALL-half, x));
        y = Math.max(WALL+half, Math.min(CH-WALL-half, y));

        // AABB vs door (block if locked)
        const door = g.objects.find(o => o.type === "door");
        if (door && !door.completed) {
          if (x+half > door.x-2 && x-half < door.x+door.w+2 && y+half > door.y && y-half < door.y+door.h) {
            x = door.x - half - 2;
          }
        }
        // AABB vs box
        const box = g.objects.find(o => o.type === "box");
        if (box) {
          if (x+half > box.x && x-half < box.x+box.w && y+half > box.y && y-half < box.y+box.h) {
            const oL = x+half-box.x, oR = box.x+box.w-(x-half);
            const oT = y+half-box.y, oB = box.y+box.h-(y-half);
            if (Math.min(oL,oR) < Math.min(oT,oB)) {
              x = oL<oR ? box.x-half : box.x+box.w+half;
            } else {
              y = oT<oB ? box.y-half : box.y+box.h+half;
            }
          }
        }
        g.playerTarget = { x, y };

        // ── Smooth interpolation ─────────────────────────────────
        const lf = 1 - Math.exp(-P_LERP * dt);
        g.playerRender = {
          x: g.playerRender.x + (g.playerTarget.x - g.playerRender.x) * lf,
          y: g.playerRender.y + (g.playerTarget.y - g.playerRender.y) * lf,
        };
      }

      // ── Proximity ─────────────────────────────────────────────
      let ni: number|null = null, nd = INTERACT_DIST;
      g.objects.forEach((o, i) => {
        const d = Math.hypot(g.playerRender.x - (o.x+o.w/2), g.playerRender.y - (o.y+o.h/2));
        if (d < nd) { nd = d; ni = i; }
      });
      g.nearbyIdx = ni;

      // Hint alpha fade
      const targetAlpha = ni !== null ? 1 : 0;
      g.hintAlpha += (targetAlpha - g.hintAlpha) * Math.min(dt * 10, 1);

      // Door unlock animation
      const isDoorDone = g.objects.find(o => o.type === "door")?.completed ?? false;
      if (isDoorDone) g.doorOpenAnim = Math.min(g.doorOpenAnim + dt * 3, 1);

      // Fade transition
      if (g.transitioning) {
        g.transitionAlpha = Math.min(g.transitionAlpha + dt * 3.5, 1);
      } else {
        g.transitionAlpha = Math.max(g.transitionAlpha - dt * 3.5, 0);
      }

      // ── Draw ─────────────────────────────────────────────────
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      renderRoom(ctx, dpr);
      renderObjects(ctx, dpr, g.objects, g.nearbyIdx, g.hintAlpha, g.doorOpenAnim, animT);
      renderPlayer(ctx, dpr, g.playerRender, g.playerDir, g.playerMoving, animT);
      renderHUD(ctx, dpr, roomIdx, rooms.length, totalXP, animT);
      renderMinimap(ctx, dpr, rooms.length, roomIdx);
      renderFade(ctx, dpr, g.transitionAlpha);

      g.rafId = requestAnimationFrame(tick);
    };

    gs.current.lastTime = performance.now();
    gs.current.rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(gs.current.rafId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, roomIdx, rooms.length, totalXP]);

  // ── Task answered correctly ──────────────────────────────────────
  const handleCorrect = useCallback(() => {
    const g = gs.current;
    if (activeType === "box") {
      const box = g.objects.find(o => o.type === "box");
      if (box) box.completed = true;
      const door = g.objects.find(o => o.type === "door");
      if (door) { door.completed = true; g.doorOpenAnim = 0; }
      SFX.doorOpen(g);
    }
    setTotalXP(p => p + XP_PER_ROOM);
    closeModal();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeType]);

  const advanceRoom = useCallback(() => {
    const g = gs.current;
    if (roomIdx >= rooms.length - 1) { closeModal(); onComplete(totalXP + XP_PER_ROOM); return; }
    
    g.transitioning = true; 
    closeModal();
    
    // Smooth fade to black (250ms) -> change state -> fade back
    setTimeout(() => {
      const next = roomIdx + 1;
      setRoomIdx(next);
      g.objects = buildObjects();
      g.doorOpenAnim = 0;
      g.playerTarget = g.playerRender = { x: WALL+40, y: CH/2 };
      
      // Secondary timeout to wait for React state to settle before fading back
      setTimeout(() => {
        g.transitioning = false;
      }, 50);
    }, 400); // Wait for fade in (about 300ms)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomIdx, rooms.length, totalXP, onComplete]);

  const closeModal = () => { gs.current.modalOpen = false; setModalOpen(false); };

  // When user presses button in modal to "go to next room", door interaction triggers advance
  const handleModalCorrect = useCallback(() => {
    if (activeType === "box") { handleCorrect(); }
    else if (activeType === "door") { advanceRoom(); }
  }, [activeType, handleCorrect, advanceRoom]);

  // ─── JSX ──────────────────────────────────────────────────────────
  if (phase === "loading") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="font-mono text-sm text-muted-foreground">Загрузка игрового модуля...</p>
      </div>
    );
  }
  if (phase === "error") {
    return (
      <div className="mx-auto max-w-md rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-center">
        <p className="font-mono text-sm text-destructive">Не удалось загрузить задания миссии.</p>
      </div>
    );
  }

  const currentRoom = rooms[roomIdx];

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Canvas */}
      <div className="relative rounded-lg overflow-hidden border border-primary/30"
        style={{ boxShadow:"0 0 40px rgba(0,255,136,0.08),0 0 80px rgba(0,0,0,0.6)", maxWidth:CW, width:"100%" }}>
        <div className="pointer-events-none absolute inset-0 z-10"
          style={{ background:"repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.06) 3px,rgba(0,0,0,0.06) 4px)" }} />
        <canvas ref={canvasRef} className="block" tabIndex={0} />
      </div>

      {/* Controls hint */}
      <div className="flex items-center gap-4 font-mono text-[10px] text-muted-foreground/60">
        <div className="flex items-center gap-1.5">
          <Keyboard className="h-3 w-3" />
          <span>WASD / Стрелки</span>
        </div>
        <span className="text-primary/40">|</span>
        <span>
          <span className="rounded border border-primary/30 bg-primary/5 px-1.5 py-0.5 font-bold text-primary">E</span>
          {" "}— взаимодействие
        </span>
      </div>

      {/* D-Pad */}
      <DPad
        onKey={(k, down) => { if (k) gs.current.keys[k] = down; }}
        onInteract={() => {
          const ni = gs.current.nearbyIdx;
          if (ni !== null && !gs.current.modalOpen && gs.current.interactCooldown <= 0) triggerInteract(ni);
        }}
      />

      {/* Modal */}
      <AnimatePresence>
        {modalOpen && currentRoom && (
          <TaskModal
            room={currentRoom}
            roomIndex={roomIdx}
            totalRooms={rooms.length}
            userId={userId}
            isLast={roomIdx >= rooms.length - 1}
            onCorrect={handleModalCorrect}
            onClose={closeModal}
            onSuccess={() => SFX.success(gs.current)}
            onError={() => SFX.error(gs.current)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
