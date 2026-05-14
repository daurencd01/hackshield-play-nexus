import { useState, useRef, TouchEvent } from 'react';

interface JoystickProps {
  onMove: (dx: number, dy: number) => void;
  onStop: () => void;
}

export function VirtualJoystick({ onMove, onStop }: JoystickProps) {
  const [active, setActive] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const baseRef = useRef<HTMLDivElement>(null);
  const center = useRef({ x: 0, y: 0 });
  const RADIUS = 50;

  const handleStart = (e: TouchEvent) => {
    const touch = e.touches[0];
    const rect = baseRef.current!.getBoundingClientRect();
    center.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
    setActive(true);
    updatePosition(touch);
  };

  const handleMove = (e: TouchEvent) => {
    if (!active) return;
    const touch = e.touches[0];
    updatePosition(touch);
  };

  const updatePosition = (touch: React.Touch | Touch) => {
    let dx = touch.clientX - center.current.x;
    let dy = touch.clientY - center.current.y;

    const dist = Math.hypot(dx, dy);
    if (dist > RADIUS) {
      dx = (dx / dist) * RADIUS;
      dy = (dy / dist) * RADIUS;
    }

    setPosition({ x: dx, y: dy });
    onMove(dx / RADIUS, dy / RADIUS);

    // Haptic feedback
    if (dist > 10 && 'vibrate' in navigator) {
      // Very short vibration on movement start/threshold
      // (Be careful not to over-vibrate)
    }
  };

  const handleEnd = () => {
    setActive(false);
    setPosition({ x: 0, y: 0 });
    onStop();
  };

  return (
    <div
      ref={baseRef}
      onTouchStart={handleStart}
      onTouchMove={handleMove}
      onTouchEnd={handleEnd}
      onTouchCancel={handleEnd}
      className="fixed bottom-10 left-10 w-32 h-32 rounded-full bg-black/40 border-2 border-[#00ff88]/40 backdrop-blur-md z-40 select-none touch-none"
      style={{
        touchAction: 'none'
      }}
    >
      {/* Background ring */}
      <div className="absolute inset-2 rounded-full border border-[#00ff88]/10" />

      {/* Joystick handle */}
      <div
        className="absolute w-14 h-14 rounded-full bg-[#00ff88]/60 border-2 border-[#00ff88] transition-all"
        style={{
          left: 'calc(50% - 28px)',
          top: 'calc(50% - 28px)',
          transform: `translate(${position.x}px, ${position.y}px)`,
          opacity: active ? 1 : 0.7,
          boxShadow: active ? '0 0 20px rgba(0,255,136,0.6)' : 'none'
        }}
      />
    </div>
  );
}

interface ActionButtonProps {
  onPress: () => void;
  label: string;
  highlighted?: boolean;
  size?: 'normal' | 'large';
  icon?: string;
  className?: string;
}

export function ActionButton({
  onPress,
  label,
  highlighted,
  size = 'normal',
  icon,
  className = ''
}: ActionButtonProps) {
  return (
    <button
      onTouchStart={(e) => {
        e.preventDefault();
        onPress();
        if ('vibrate' in navigator) navigator.vibrate(10);
      }}
      className={`
        rounded-full font-mono border-2 transition-all active:scale-90 flex items-center justify-center
        ${size === 'large' ? 'w-20 h-20 text-2xl' : 'w-16 h-16 text-base'}
        ${highlighted
          ? 'bg-[#00ff88] border-[#00ff88] text-black animate-pulse shadow-lg shadow-[#00ff88]/50'
          : 'bg-black/60 border-[#00ff88]/40 text-[#00ff88] backdrop-blur-md'}
        ${className}
      `}
      style={{ touchAction: 'none' }}
      aria-label={label}
    >
      {icon || label}
    </button>
  );
}

interface TouchControlsProps {
  onMove: (dx: number, dy: number) => void;
  onStop: () => void;
  onAction: () => void;
  onCrouch: () => void;
  hasInteraction: boolean;
  isCrouching: boolean;
}

export function TouchControls({
  onMove,
  onStop,
  onAction,
  onCrouch,
  hasInteraction,
  isCrouching
}: TouchControlsProps) {
  return (
    <>
      <VirtualJoystick onMove={onMove} onStop={onStop} />

      <div
        className="fixed bottom-10 right-10 flex flex-col items-end gap-5 z-40"
      >
        <ActionButton
          onPress={onCrouch}
          label="C"
          icon="🚶"
          highlighted={isCrouching}
          className="mb-2"
        />
        <ActionButton
          onPress={onAction}
          label="E"
          size="large"
          highlighted={hasInteraction}
        />
      </div>
    </>
  );
}
