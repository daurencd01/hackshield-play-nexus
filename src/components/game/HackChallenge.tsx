import React, { useState } from 'react';
import { Terminal as TerminalIcon, ShieldAlert, CheckCircle2, XCircle, Cpu } from 'lucide-react';
import type { HackChallenge as Challenge } from '@/game/hackChallenges';

interface Props {
  challenge: Challenge;
  isMainObjective: boolean;
  onResolve: (correct: boolean, xp: number) => void;
  onClose: () => void;
}

export const HackChallenge: React.FC<Props> = ({ challenge, isMainObjective, onResolve, onClose }) => {
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;
  const correct = answered && picked === challenge.correctIndex;

  const choose = (i: number) => {
    if (answered) return;
    setPicked(i);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4">
      <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto bg-[#0b121c] border border-cyan-500/30 rounded-2xl shadow-[0_0_60px_rgba(6,182,212,0.15)]">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-cyan-500/20 bg-gradient-to-r from-cyan-950/40 to-transparent">
          {isMainObjective ? <Cpu className="w-6 h-6 text-amber-400" /> : <TerminalIcon className="w-6 h-6 text-cyan-400" />}
          <div className="min-w-0">
            <p className="text-[10px] font-mono uppercase tracking-widest text-cyan-500">
              {isMainObjective ? '★ C2 KILL-SWITCH' : 'BREACHING'} · {challenge.category}
            </p>
            <h2 className="text-lg font-bold text-white tracking-tight">Взлом терминала</h2>
          </div>
          <div className="ml-auto text-xs font-mono text-amber-400 shrink-0">+{challenge.xpReward} XP</div>
        </div>

        {/* Question */}
        <div className="px-6 py-5">
          <p className="text-white text-sm leading-relaxed mb-5">{challenge.prompt}</p>

          <div className="grid gap-2.5">
            {challenge.options.map((opt, i) => {
              const isCorrect = i === challenge.correctIndex;
              const isPicked = i === picked;
              let cls = 'border-gray-700/70 bg-zinc-900/40 hover:border-cyan-500/50 text-gray-200';
              if (answered) {
                if (isCorrect) cls = 'border-emerald-500/60 bg-emerald-500/10 text-emerald-300';
                else if (isPicked) cls = 'border-red-500/60 bg-red-500/10 text-red-300';
                else cls = 'border-gray-800/60 bg-zinc-900/30 text-gray-500';
              }
              return (
                <button
                  key={i}
                  onClick={() => choose(i)}
                  disabled={answered}
                  className={`flex items-start gap-3 text-left p-3 rounded-xl border transition-all text-sm ${cls} ${answered ? 'cursor-default' : 'cursor-pointer active:scale-[0.99]'}`}
                >
                  <span className="font-mono text-xs mt-0.5 opacity-70">{String.fromCharCode(65 + i)}</span>
                  <span className="flex-1">{opt}</span>
                  {answered && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                  {answered && isPicked && !isCorrect && <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Result + explanation */}
          {answered && (
            <div className={`mt-4 p-3 rounded-xl border text-sm ${correct ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-300' : 'border-red-500/30 bg-red-500/5 text-red-300'}`}>
              <div className="flex items-center gap-2 font-bold mb-1">
                {correct ? <CheckCircle2 className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                {correct ? 'ДОСТУП ПОЛУЧЕН' : 'ОТКАЗ — ТРЕВОГА!'}
              </div>
              <p className="text-xs text-gray-300 leading-relaxed">{challenge.explanation}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex gap-3">
          {!answered ? (
            <button onClick={onClose} className="ml-auto px-5 py-2.5 text-xs font-mono uppercase tracking-widest text-gray-500 hover:text-gray-300">
              Отмена
            </button>
          ) : correct ? (
            <button
              onClick={() => onResolve(true, challenge.xpReward)}
              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-semibold rounded-xl transition-all"
            >
              {isMainObjective ? 'Отключить C2 →' : 'Подтвердить взлом →'}
            </button>
          ) : (
            <div className="w-full flex gap-3">
              <button
                onClick={() => onResolve(false, 0)}
                className="flex-1 py-3 border border-gray-700 text-gray-300 hover:text-white rounded-xl transition-all"
              >
                Отступить
              </button>
              <button
                onClick={() => setPicked(null)}
                className="flex-1 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold rounded-xl transition-all"
              >
                Повторить
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
