import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal, ChevronRight, CheckCircle, XCircle, RotateCcw, X, Award, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { dataService } from "@/lib/dataService";
import { addXp } from "@/hooks/useUser";
import { RoomTask } from "@/data/russianTasks";
import { Quiz } from "@/types/quiz";

type AnswerState = "idle" | "submitting" | "correct" | "wrong";

export interface TaskModalProps {
  room: Quiz | RoomTask;
  roomIndex: number;
  totalRooms: number;
  userId: string;
  isLast: boolean;
  onCorrect: () => void;
  onClose: () => void;
  onSuccess: () => void;
  onError: () => void;
  missionId: string;
}

export default function TaskModal({ room, roomIndex, totalRooms, userId, isLast, onCorrect, onClose, onSuccess, onError, missionId }: TaskModalProps) {
  const [textVal, setTextVal]   = useState("");
  const [state, setState]       = useState<AnswerState>("idle");
  const [shake, setShake]       = useState(false);
  const [xpVisible, setXpVis]   = useState(false);
  const [explanation, setExp]   = useState("");
  const submitting = useRef(false);

  // Helper to get field values regardless of type
  const getField = (field: string) => {
    if (field === 'title') return (room as any).title_ru || (room as any).title;
    if (field === 'description') return (room as any).description_ru || (room as any).description;
    if (field === 'hint') return (room as any).hint_ru || (room as any).hint;
    if (field === 'type') {
      const type = (room as any).type;
      if (type === 'multiple_choice') return 'choice';
      if (type === 'text_input') return 'text';
      return type;
    }
    return (room as any)[field];
  };

  const title = getField('title');
  const description = getField('description');
  const hint = getField('hint');
  const type = getField('type');
  const xpReward = (room as any).xp_reward || (room as any).xpReward;

  useEffect(() => { document.body.style.overflow="hidden"; return () => { document.body.style.overflow=""; }; }, []);

  const submitResult = useCallback(async (isCorrect: boolean, exp: string) => {
    if (state !== "idle" || submitting.current) return;
    submitting.current = true;
    setState("submitting");
    setExp(exp);

    if (isCorrect) {
      await Promise.allSettled([
        addXp(userId, xpReward),
        dataService.saveUserProgress(userId, missionId, roomIndex, isLast)
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
  }, [state, xpReward, userId, roomIndex, isLast, onSuccess, onError, missionId]);

  const handleChoiceSubmit = (isCorrect: boolean, exp: string) => submitResult(isCorrect, exp);

  const handleBinarySubmit = (choice: 'yes' | 'no') => {
    const correctChoice = (room as any).correct_choice || (room as any).correctChoice;
    const isCorrect = choice === correctChoice;
    submitResult(isCorrect, isCorrect ? "Правильный выбор!" : "Ошибка. Это решение было небезопасным.");
  };

  const handleTextSubmit = () => {
    if (!textVal.trim()) return;
    let isCorrect = false;

    if (type === 'sequence') {
      const sequence = (room as any).correct_sequence || (room as any).sequence;
      if (sequence) {
        const correctSeq = sequence.map((_: any, i: number) => i + 1).join('');
        const inputSeq = textVal.replace(/\D/g, '');
        if (inputSeq === correctSeq) isCorrect = true;
        submitResult(isCorrect, isCorrect ? "Последовательность верна." : "Неверный порядок действий.");
        return;
      }
    }

    const caseSensitive = (room as any).case_sensitive || (room as any).caseSensitive;
    const v = caseSensitive ? textVal.trim() : textVal.trim().toLowerCase();
    
    const correctAnswer = (room as any).correct_answer || (room as any).correctAnswer;
    const ans = caseSensitive ? correctAnswer : correctAnswer?.toLowerCase();
    
    if (v === ans) isCorrect = true;
    
    const acceptVariants = (room as any).accept_variants || (room as any).acceptVariants;
    if (acceptVariants) {
      const variants = caseSensitive ? acceptVariants : acceptVariants.map((x: string) => x.toLowerCase());
      if (variants.includes(v)) isCorrect = true;
    }

    submitResult(isCorrect, isCorrect ? "Ввод принят. Доступ разрешен." : "Неверный ввод. В доступе отказано.");
  };

  const retry = () => { setTextVal(""); setState("idle"); };

  const options = (room as any).options || [];

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
        <div className="pointer-events-none absolute inset-0 z-10 bg-scanline" />
        <AnimatePresence>
          {state === "correct" && (
            <motion.div initial={{ opacity:0.4 }} animate={{ opacity:0 }} transition={{ duration:0.5 }} className="pointer-events-none absolute inset-0 z-20 bg-primary/20" />
          )}
        </AnimatePresence>
        
        <div className="relative flex items-center justify-between border-b border-primary/20 bg-black/40 px-4 py-3">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-primary" />
            <span className="font-orbitron text-xs font-bold uppercase tracking-widest text-primary">{title}</span>
            <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[9px] text-primary">{getField('category')}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] text-muted-foreground">ROOM [{roomIndex+1}/{totalRooms}]</span>
            {state !== "correct" && (
              <button onClick={onClose} className="rounded p-1 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"><X className="h-3.5 w-3.5" /></button>
            )}
          </div>
        </div>
        
        <div className="relative p-5 space-y-4">
          <p className="font-mono text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">{description}</p>
          
          {type === 'sequence' && (
            <div className="rounded-md border border-primary/20 bg-primary/5 p-3 space-y-1">
              {((room as any).correct_sequence || (room as any).sequence || []).map((seqStr: string, idx: number) => (
                <div key={idx} className="font-mono text-xs text-primary/80">{idx + 1}. {seqStr}</div>
              ))}
            </div>
          )}
          
          {(state === "idle" || state === "submitting") && (
            <div className="space-y-3 mt-4">
              
              {type === 'choice' && options.length > 0 && (
                <div className="flex flex-col gap-2">
                  <label className="font-orbitron text-[10px] font-bold uppercase tracking-widest text-secondary">&gt;_ ВЫБЕРИТЕ ВАРИАНТ:</label>
                  {options.map((opt: any, i: number) => (
                    <button
                      key={i}
                      onClick={() => handleChoiceSubmit(opt.is_correct ?? opt.isCorrect, opt.explanation_ru ?? opt.explanation)}
                      disabled={state === "submitting"}
                      className="flex w-full items-center justify-between rounded-md border border-primary/20 bg-black/40 px-4 py-3 font-mono text-sm text-primary transition-all hover:bg-primary/10 disabled:opacity-50 text-left"
                    >
                      <span>{opt.text_ru || opt.text}</span>
                      <ChevronRight className="h-4 w-4 opacity-50" />
                    </button>
                  ))}
                </div>
              )}

              {type === 'binary' && (
                <div className="flex gap-3">
                  <Button onClick={() => handleBinarySubmit('yes')} disabled={state === "submitting"} className="flex-1 font-orbitron text-xs uppercase bg-primary text-primary-foreground hover:bg-primary/90">
                    Да
                  </Button>
                  <Button onClick={() => handleBinarySubmit('no')} disabled={state === "submitting"} variant="outline" className="flex-1 font-orbitron text-xs uppercase border-destructive/40 text-destructive hover:bg-destructive/10">
                    Нет
                  </Button>
                </div>
              )}

              {(type === 'text' || type === 'sequence' || type === 'code') && (
                <div className="space-y-3">
                  <label className="font-orbitron text-[10px] font-bold uppercase tracking-widest text-secondary">
                    &gt;_ {type === 'sequence' ? "ВВЕДИТЕ НОМЕРА ВЕРНОМ ПОРЯДКЕ (напр. 12345):" : "ВВЕДИТЕ ОТВЕТ:"}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      autoFocus
                      value={textVal}
                      onChange={e => setTextVal(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleTextSubmit()}
                      disabled={state === "submitting"}
                      className="flex-1 rounded border border-primary/30 bg-black/50 px-3 py-2 font-mono text-sm text-primary placeholder:text-primary/30 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50"
                      placeholder={type === 'sequence' ? "12345" : "Ввод..."}
                    />
                    <Button onClick={handleTextSubmit} disabled={state === "submitting" || !textVal.trim()} className="font-orbitron text-xs uppercase bg-primary text-primary-foreground hover:bg-primary/90 px-6">
                      <Terminal className="mr-2 h-4 w-4" /> Ввод
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <AnimatePresence>
            {state === "correct" && (
              <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} className="rounded-md border border-primary/40 bg-primary/10 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20"><CheckCircle className="h-5 w-5 text-primary" /></div>
                  <div className="flex-1">
                    <div className="font-orbitron text-sm font-bold text-primary">ACCESS GRANTED</div>
                    <div className="mt-1 font-mono text-[11px] leading-relaxed text-primary/80">{explanation}</div>
                  </div>
                  <motion.span initial={{ opacity:0, scale:0.5 }} animate={{ opacity: xpVisible ? 1 : 0, scale: xpVisible ? 1 : 1.2 }} className="ml-auto font-orbitron text-lg font-bold text-neon-yellow drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]">+{xpReward} XP</motion.span>
                </div>
                <Button onClick={onCorrect} className="w-full font-orbitron text-xs uppercase bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_rgba(0,255,136,0.4)] transition-all">
                  {isLast ? <><Award className="mr-2 h-4 w-4" /> Завершить Миссию</> : "Отключиться от терминала"}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
          
          <AnimatePresence>
            {state === "wrong" && (
              <motion.div initial={{ opacity:0, x:[-10, 10, -10, 10, 0] }} animate={{ opacity:1 }} className="rounded-md border border-destructive/40 bg-destructive/10 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-destructive/20"><XCircle className="h-4 w-4 text-destructive" /></div>
                  <span className="font-orbitron text-xs font-bold text-destructive">CRITICAL ERROR: ACCESS DENIED</span>
                </div>
                {explanation && <div className="pl-9 font-mono text-[11px] text-destructive/80 mb-2">{explanation}</div>}
                <div className="pl-9 pt-1 flex items-center justify-between">
                  <Button variant="outline" onClick={retry} className="h-8 font-orbitron text-[10px] uppercase border-destructive/40 text-destructive hover:bg-destructive/20 transition-all">
                    <RotateCcw className="mr-1.5 h-3 w-3" /> Повторить
                  </Button>
                  {hint && (
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground bg-black/40 px-2 py-1 rounded border border-white/5">
                      <ShieldAlert className="h-3 w-3 text-secondary" /> {hint}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
