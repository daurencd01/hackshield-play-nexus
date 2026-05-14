import React, { useState, useRef } from 'react';

interface JoystickProps {
  onMove: (dx: number, dy: number) => void;
  onStop: () => void;
}

export function VirtualJoystick({ onMove, onStop }: JoystickProps) {
  const [active, setActive] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const baseRef = useRef<HTMLDivElement>(null);
  const center = useRef({ x: 0, y: 0 });

  const RADIUS = 50;

  const handleStart = (e: React.PointerEvent) => {
    const rect = baseRef.current!.getBoundingClientRect();
    center.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
    setActive(true);
    updatePosition(e.clientX, e.clientY);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleMove = (e: React.PointerEvent) => {
    if (!active) return;
    updatePosition(e.clientX, e.clientY);
  };

  const updatePosition = (clientX: number, clientY: number) => {
    let dx = clientX - center.current.x;
    let dy = clientY - center.current.y;

    const dist = Math.hypot(dx, dy);
    if (dist > RADIUS) {
      dx = (dx / dist) * RADIUS;
      dy = (dy / dist) * RADIUS;
    }

    setPos({ x: dx, y: dy });
    onMove(dx / RADIUS, dy / RADIUS);
  };

  const handleEnd = (e: React.PointerEvent) => {
    setActive(false);
    setPos({ x: 0, y: 0 });
    onStop();
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  return (
    <div
      ref={baseRef}
      onPointerDown={handleStart}
      onPointerMove={handleMove}
      onPointerUp={handleEnd}
      onPointerCancel={handleEnd}
      className="fixed bottom-10 left-10 w-32 h-32 rounded-full bg-black/40 border-2 border-[#00ff88]/40 backdrop-blur-md z-40 select-none touch-none"
      style={{ touchAction: 'none' }}
    >
      {/* Background ring */}
      <div className="absolute inset-2 rounded-full border border-[#00ff88]/10" />

      {/* Joystick handle */}
      <div
        className="absolute w-14 h-14 rounded-full bg-[#00ff88]/60 border-2 border-[#00ff88] transition-all"
        style={{
          left: 'calc(50% - 28px)',
          top: 'calc(50% - 28px)',
          transform: `translate(${pos.x}px, ${pos.y}px)`,
          opacity: active ? 1 : 0.7,
          boxShadow: active ? '0 0 20px rgba(0,255,136,0.6)' : 'none'
        }}
      />
    </div>
  );
}

interface ActionProps {
  onAction: () => void;
  onCrouch: () => void;
  isCrouching: boolean;
  hasInteraction: boolean;
}

export function ActionButtons({ onAction, onCrouch, isCrouching, hasInteraction }: ActionProps) {
  return (
    <div className="fixed bottom-10 right-10 flex flex-col items-end gap-5 z-40">
      <button
        onPointerDown={(e) => { 
          e.stopPropagation(); 
          onCrouch(); 
          if ('vibrate' in navigator) navigator.vibrate(10);
        }}
        className={`w-16 h-16 rounded-full font-mono text-xl border-2 transition-all active:scale-90 flex items-center justify-center select-none backdrop-blur-md ${
          isCrouching
            ? 'bg-[#00ff88] border-[#00ff88] text-black shadow-lg shadow-[#00ff88]/50'
            : 'bg-black/40 border-[#00ff88]/40 text-[#00ff88]'
        }`}
        style={{ touchAction: 'none' }}
      >
        🚶
      </button>

      <button
        onPointerDown={(e) => { 
          e.stopPropagation(); 
          onAction(); 
          if ('vibrate' in navigator) navigator.vibrate(20);
        }}
        className={`w-20 h-20 rounded-full font-mono text-2xl border-2 transition-all active:scale-90 flex items-center justify-center select-none backdrop-blur-md ${
          hasInteraction
            ? 'bg-[#00ff88] border-[#00ff88] text-black animate-pulse shadow-lg shadow-[#00ff88]/50'
            : 'bg-black/60 border-[#00ff88]/40 text-[#00ff88]'
        }`}
        style={{ touchAction: 'none' }}
      >
        E
      </button>
    </div>
  );
}
