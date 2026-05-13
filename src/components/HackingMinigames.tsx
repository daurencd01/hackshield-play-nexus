import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';

interface Props {
  onSuccess: () => void;
  onFail: () => void;
}

export function FrequencyHack({ onSuccess, onFail }: Props) {
  const [position, setPosition] = useState(0);
  const [timeLeft, setTimeLeft] = useState(8);
  const targetZone = useMemo(() => ({
    start: 30 + Math.random() * 40,
    width: 20
  }), []);

  useEffect(() => {
    const t = setInterval(() => setTimeLeft(prev => prev - 0.1), 100);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (timeLeft <= 0) onFail();
  }, [timeLeft, onFail]);

  const checkLock = () => {
    if (position >= targetZone.start && position <= targetZone.start + targetZone.width) {
      onSuccess();
    } else {
      onFail();
    }
  };

  return (
    <div className="bg-black/95 border-2 border-[#00ff88] p-6 rounded-xl max-w-md w-full shadow-[0_0_20px_rgba(0,255,136,0.3)]">
      <h3 className="text-[#00ff88] font-mono text-lg mb-2 flex justify-between">
        <span>ВЗЛОМ ЧАСТОТЫ</span>
        <span className="text-yellow-400">⏱ {timeLeft.toFixed(1)}с</span>
      </h3>
      <p className="text-gray-400 text-sm mb-4 font-mono">
        Останови ползунок в активной зоне для перехвата сигнала.
      </p>

      <div className="relative h-12 bg-gray-900 border border-[#00ff88]/40 rounded mb-6 overflow-hidden">
        <div
          className="absolute top-0 bottom-0 bg-[#00ff88]/30 border-l border-r border-[#00ff88]"
          style={{
            left: `${targetZone.start}%`,
            width: `${targetZone.width}%`
          }}
        />
        <input
          type="range"
          min={0}
          max={100}
          step={0.5}
          value={position}
          onChange={(e) => setPosition(+e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        <div
          className="absolute top-0 bottom-0 w-1 bg-yellow-400 shadow-[0_0_10px_#facc15] transition-all duration-75"
          style={{ left: `${position}%` }}
        />
      </div>

      <button
        onClick={checkLock}
        className="w-full py-4 bg-[#00ff88] text-black font-mono font-bold text-lg rounded active:scale-95 transition-all shadow-[0_0_15px_rgba(0,255,136,0.5)]"
      >
        ЗАФИКСИРОВАТЬ
      </button>
    </div>
  );
}

export function MemoryHack({ onSuccess, onFail, length = 4 }: Props & { length?: number }) {
  const sequence = useMemo(() => Array.from({ length }, () => Math.floor(Math.random() * 4)), [length]);
  const [phase, setPhase] = useState<'showing' | 'input'>('showing');
  const [currentShow, setCurrentShow] = useState(-1);
  const [userInput, setUserInput] = useState<number[]>([]);

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setCurrentShow(sequence[i]);
      setTimeout(() => setCurrentShow(-1), 400);
      i++;
      if (i >= sequence.length) {
        clearInterval(interval);
        setTimeout(() => setPhase('input'), 600);
      }
    }, 800);
    return () => clearInterval(interval);
  }, [sequence]);

  const handleClick = (idx: number) => {
    if (phase !== 'input') return;
    const newInput = [...userInput, idx];
    setUserInput(newInput);

    if (sequence[newInput.length - 1] !== idx) {
      onFail();
      return;
    }
    if (newInput.length === sequence.length) {
      setTimeout(onSuccess, 300);
    }
  };

  const colors = ['#00ff88', '#00aaff', '#ff00aa', '#ffaa00'];

  return (
    <div className="bg-black/95 border-2 border-[#00ff88] p-6 rounded-xl w-full max-w-sm">
      <h3 className="text-[#00ff88] font-mono text-lg mb-4 text-center">
        {phase === 'showing' ? 'ЗАПОМНИ ПОСЛЕДОВАТЕЛЬНОСТЬ' : 'ПОВТОРИ КОД'}
      </h3>

      <div className="grid grid-cols-2 gap-4">
        {colors.map((color, i) => (
          <button
            key={i}
            onClick={() => handleClick(i)}
            disabled={phase !== 'input'}
            className="w-full aspect-square rounded-lg border-2 transition-all active:scale-90"
            style={{
              backgroundColor: currentShow === i ? color : 'rgba(0,0,0,0.5)',
              borderColor: color,
              boxShadow: currentShow === i ? `0 0 40px ${color}` : 'none'
            }}
          />
        ))}
      </div>

      <div className="mt-6 flex justify-center gap-2">
        {sequence.map((_, i) => (
          <div 
            key={i} 
            className={`w-3 h-3 rounded-full border border-[#00ff88] ${userInput.length > i ? 'bg-[#00ff88]' : 'bg-transparent'}`}
          />
        ))}
      </div>
    </div>
  );
}
