import React, { useState, useRef, TouchEvent } from 'react';

interface JoystickProps {
  onMove: (dx: number, dy: number) => void;
  onStop: () => void;
}

export function VirtualJoystick({ onMove, onStop }: JoystickProps) {
  const [active, setActive] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const baseRef = useRef<HTMLDivElement>(null);
  const center = useRef({ x: 0, y: 0 });

  const RADIUS = 40;

  const handleStart = (e: TouchEvent) => {
    const touch = e.touches[0];
    const rect = baseRef.current!.getBoundingClientRect();
    center.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
    setActive(true);
    updatePosition(touch.clientX, touch.clientY);
  };

  const handleMove = (e: TouchEvent) => {
    if (!active) return;
    const touch = e.touches[0];
    updatePosition(touch.clientX, touch.clientY);
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

  const handleEnd = () => {
    setActive(false);
    setPos({ x: 0, y: 0 });
    onStop();
  };

  return (
    <div
      ref={baseRef}
      onTouchStart={handleStart}
      onTouchMove={handleMove}
      onTouchEnd={handleEnd}
      onTouchCancel={handleEnd}
      className="fixed bottom-10 left-10 w-24 h-24 rounded-full bg-black/40 border-2 border-[#00ff88]/30 backdrop-blur-sm z-40 select-none touch-none"
      style={{ touchAction: 'none' }}
    >
      <div className="absolute inset-1.5 rounded-full border border-[#00ff88]/10" />
      <div
        className="absolute w-10 h-10 rounded-full bg-[#00ff88]/50 border-2 border-[#00ff88] transition-transform duration-75"
        style={{
          left: 'calc(50% - 20px)',
          top: 'calc(50% - 20px)',
          transform: `translate(${pos.x}px, ${pos.y}px)`,
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
    <div className="fixed bottom-10 right-10 flex flex-col gap-4 z-40">
      <button
        onTouchStart={(e) => { e.preventDefault(); onAction(); }}
        className={`w-16 h-16 rounded-full font-mono text-2xl border-2 transition-all active:scale-90 flex items-center justify-center ${
          hasInteraction
            ? 'bg-[#00ff88]/30 border-[#00ff88] text-white animate-pulse'
            : 'bg-black/40 border-gray-600 text-gray-500'
        }`}
        style={{ touchAction: 'none' }}
      >
        E
      </button>

      <button
        onTouchStart={(e) => { e.preventDefault(); onCrouch(); }}
        className={`w-14 h-14 rounded-full font-mono text-xl border-2 transition-all active:scale-90 flex items-center justify-center ${
          isCrouching
            ? 'bg-purple-500/40 border-purple-400 text-white'
            : 'bg-black/40 border-gray-600 text-gray-400'
        }`}
        style={{ touchAction: 'none' }}
      >
        👤
      </button>
    </div>
  );
}
