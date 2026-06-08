import { useEffect, useRef } from "react";
import { MoveUp, MoveDown, MoveLeft, MoveRight, Fingerprint, Maximize, RotateCcw } from "lucide-react";

interface MobileControlsProps {
  onAction?: () => void;
  onFullscreen?: () => void;
  onRespawn?: () => void;
}

export default function MobileControls({ onAction, onFullscreen, onRespawn }: MobileControlsProps) {
  const intervals = useRef<Record<string, any>>({});

  const startPress = (key: string) => {
    if (intervals.current[key]) return;
    
    // Dispatch initial keydown
    window.dispatchEvent(new KeyboardEvent('keydown', { key }));
    
    // Repeat every 50ms
    intervals.current[key] = setInterval(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key }));
    }, 50);
  };

  const stopPress = (key: string) => {
    if (intervals.current[key]) {
      clearInterval(intervals.current[key]);
      delete intervals.current[key];
      window.dispatchEvent(new KeyboardEvent('keyup', { key }));
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(intervals.current).forEach(clearInterval);
    };
  }, []);

  const Button = ({ icon: Icon, onPressStart, onPressEnd, className = "", label = "" }: any) => (
    <button
      onTouchStart={() => onPressStart()}
      onTouchEnd={() => onPressEnd()}
      onMouseDown={() => onPressStart()}
      onMouseUp={() => onPressEnd()}
      onContextMenu={(e) => e.preventDefault()}
      className={`flex items-center justify-center rounded-2xl bg-white/10 border border-white/20 active:scale-90 active:bg-[#00ff88]/20 transition-all select-none touch-none ${className}`}
    >
      <Icon className="w-8 h-8 text-white" />
      {label && <span className="absolute -top-6 text-[10px] text-gray-500 font-mono">{label}</span>}
    </button>
  );

  return (
    <div className="fixed inset-0 pointer-events-none z-50 md:hidden font-mono">
      {/* Top Buttons */}
      <div className="absolute top-4 right-4 flex gap-2 pointer-events-auto">
        <button 
          onClick={onFullscreen}
          className="p-3 rounded-xl bg-black/40 border border-white/10 text-white active:bg-[#00ff88]/20"
        >
          <Maximize className="w-5 h-5" />
        </button>
        <button 
          onClick={onRespawn}
          className="p-3 rounded-xl bg-black/40 border border-white/10 text-red-500 active:bg-red-500/20"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>

      {/* D-Pad (Left Side) */}
      <div className="absolute bottom-12 left-12 grid grid-cols-3 gap-2 pointer-events-auto">
        <div />
        <Button 
          icon={MoveUp} 
          onPressStart={() => startPress('ArrowUp')} 
          onPressEnd={() => stopPress('ArrowUp')} 
          className="w-16 h-16"
        />
        <div />
        <Button 
          icon={MoveLeft} 
          onPressStart={() => startPress('ArrowLeft')} 
          onPressEnd={() => stopPress('ArrowLeft')} 
          className="w-16 h-16"
        />
        <div />
        <Button 
          icon={MoveRight} 
          onPressStart={() => startPress('ArrowRight')} 
          onPressEnd={() => stopPress('ArrowRight')} 
          className="w-16 h-16"
        />
        <div />
        <Button 
          icon={MoveDown} 
          onPressStart={() => startPress('ArrowDown')} 
          onPressEnd={() => stopPress('ArrowDown')} 
          className="w-16 h-16"
        />
        <div />
      </div>

      {/* Action Button (Right Side) */}
      <div className="absolute bottom-16 right-16 pointer-events-auto">
        <button
          onTouchStart={() => { 
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'e' }));
            if (onAction) onAction();
          }}
          onContextMenu={(e) => e.preventDefault()}
          className="w-24 h-24 rounded-full bg-[#00ff88]/20 border-4 border-[#00ff88]/50 flex items-center justify-center active:scale-95 active:bg-[#00ff88]/40 transition-all shadow-[0_0_30px_rgba(0,255,136,0.2)] touch-none"
        >
          <div className="flex flex-col items-center gap-1">
            <Fingerprint className="w-10 h-10 text-[#00ff88]" />
            <span className="text-[10px] font-bold text-[#00ff88]">INTERACT [E]</span>
          </div>
        </button>
      </div>
    </div>
  );
}
