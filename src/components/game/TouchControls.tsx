import React, { useRef, useState } from 'react';

interface Props {
  onMove: (x: number, y: number) => void; // normalized -1..1
  onAction: () => void;                    // hack / interact (E)
  onStealth: (on: boolean) => void;        // hold to sneak
}

/**
 * On-screen touch controls for the 2D game (mobile only).
 * Left: virtual joystick. Right: ACTION (hack) button + hold-to-sneak.
 */
export const TouchControls: React.FC<Props> = ({ onMove, onAction, onStealth }) => {
  const baseRef = useRef<HTMLDivElement>(null);
  const activeId = useRef<number | null>(null);
  const [thumb, setThumb] = useState({ x: 0, y: 0 });
  const [stealth, setStealth] = useState(false);

  const RADIUS = 52;

  const handleDown = (e: React.PointerEvent) => {
    activeId.current = e.pointerId;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    move(e);
  };

  const move = (e: React.PointerEvent) => {
    if (activeId.current !== e.pointerId || !baseRef.current) return;
    const r = baseRef.current.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    let dx = e.clientX - cx;
    let dy = e.clientY - cy;
    const dist = Math.hypot(dx, dy) || 1;
    const clamped = Math.min(dist, RADIUS);
    const nx = (dx / dist) * (clamped / RADIUS);
    const ny = (dy / dist) * (clamped / RADIUS);
    setThumb({ x: (dx / dist) * clamped, y: (dy / dist) * clamped });
    onMove(nx, ny);
  };

  const handleUp = (e: React.PointerEvent) => {
    if (activeId.current !== e.pointerId) return;
    activeId.current = null;
    setThumb({ x: 0, y: 0 });
    onMove(0, 0);
  };

  const toggleStealth = () => {
    const next = !stealth;
    setStealth(next);
    onStealth(next);
  };

  return (
    <div className="fixed inset-0 z-40 md:hidden pointer-events-none select-none">
      {/* Joystick */}
      <div
        ref={baseRef}
        onPointerDown={handleDown}
        onPointerMove={move}
        onPointerUp={handleUp}
        onPointerCancel={handleUp}
        className="pointer-events-auto absolute bottom-6 left-6 w-32 h-32 rounded-full bg-black/40 border border-cyan-500/30 backdrop-blur-sm touch-none"
        style={{ touchAction: 'none' }}
      >
        <div
          className="absolute top-1/2 left-1/2 w-14 h-14 rounded-full bg-cyan-500/40 border border-cyan-400/60"
          style={{ transform: `translate(calc(-50% + ${thumb.x}px), calc(-50% + ${thumb.y}px))` }}
        />
      </div>

      {/* Right cluster */}
      <div className="pointer-events-auto absolute bottom-6 right-6 flex flex-col items-center gap-3">
        <button
          onClick={toggleStealth}
          className={`w-14 h-14 rounded-full border text-[11px] font-mono font-bold transition-all ${
            stealth ? 'bg-cyan-500 text-black border-cyan-400' : 'bg-black/40 text-cyan-300 border-cyan-500/40'
          }`}
        >
          ТИХО
        </button>
        <button
          onPointerDown={(e) => { e.preventDefault(); onAction(); }}
          className="w-20 h-20 rounded-full bg-emerald-500/90 active:bg-emerald-400 text-black font-bold text-lg shadow-lg shadow-emerald-500/30 border-2 border-emerald-300"
        >
          E
        </button>
      </div>
    </div>
  );
};
