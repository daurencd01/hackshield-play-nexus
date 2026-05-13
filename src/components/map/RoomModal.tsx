import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal, ChevronRight, CheckCircle, XCircle, RotateCcw, Loader2, X, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { dataService } from "@/lib/dataService";
import { addXp } from "@/hooks/useUser";
import { ScenarioRoom } from "@/components/ScenarioMap";
import { XP_PER_ROOM } from "@/hooks/map/useMapEngine";

type AnswerState = "idle" | "submitting" | "correct" | "wrong";

function normalizeAnswer(v: string) {
  return v.trim().toLowerCase();
}

interface RoomModalProps {
  room: ScenarioRoom;
  roomNumber: number;
  totalRooms: number;
  userId: string;
  isLast: boolean;
  onCorrect: () => void;
  onClose: () => void;
}

export function RoomModal({ room, roomNumber, totalRooms, userId, isLast, onCorrect, onClose }: RoomModalProps) {
  const [answer, setAnswer] = useState("");
  const [answerState, setAnswerState] = useState<AnswerState>("idle");
  const [xpFlash, setXpFlash] = useState(false);
  const submitting = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 200);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleSubmit = useCallback(async () => {
    if (answerState !== "idle" || submitting.current || !answer.trim()) return;
    submitting.current = true;
    setAnswerState("submitting");

    const correct = normalizeAnswer(answer) === normalizeAnswer(room.correct_answer);

    if (correct) {
      await Promise.allSettled([
        addXp(userId, XP_PER_ROOM),
        dataService.saveUserProgress(userId, room.mission_id, roomNumber, isLast)
      ]);
      setXpFlash(true);
      setAnswerState("correct");
    } else {
      setAnswerState("wrong");
    }

    submitting.current = false;
  }, [answer, answerState, room, userId, roomNumber, isLast]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && answerState === "idle") handleSubmit();
  };

  const handleRetry = () => {
    setAnswer("");
    setAnswerState("idle");
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="relative w-full max-w-lg rounded-xl border border-primary/40 bg-background shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between border-b border-border bg-card/80 px-4 py-3">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-primary" />
            <span className="font-orbitron text-xs font-bold uppercase tracking-wider text-primary">
              {room.title}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] text-muted-foreground">
              [{roomNumber}/{totalRooms}]
            </span>
            <button
              onClick={onClose}
              className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <p className="font-mono text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
            {room.task}
          </p>

          {(answerState === "idle" || answerState === "submitting") && (
            <div className="space-y-2">
              <label htmlFor="room-answer" className="font-orbitron text-[10px] font-bold uppercase tracking-wider text-secondary">
                Введи ответ:
              </label>
              <div className="flex gap-2">
                <input
                  id="room-answer"
                  ref={inputRef}
                  type="text"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={answerState === "submitting"}
                  placeholder="Твой ответ..."
                  autoComplete="off"
                  spellCheck={false}
                  className="flex-1 rounded-md border border-border bg-muted/30 px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/40 transition-all disabled:opacity-50"
                />
                <Button
                  onClick={handleSubmit}
                  disabled={!answer.trim() || answerState === "submitting"}
                  className="font-orbitron text-xs uppercase bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-40"
                >
                  {answerState === "submitting" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}

          <AnimatePresence>
            {answerState === "correct" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="rounded-md border border-primary/40 bg-primary/5 p-4 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  <span className="font-orbitron text-xs font-bold text-primary">
                    ВЕРНО!{" "}
                    <motion.span
                      key="xp"
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: xpFlash ? 1 : 0, y: xpFlash ? 0 : -8 }}
                      className="text-neon-yellow"
                    >
                      +{XP_PER_ROOM} XP
                    </motion.span>
                  </span>
                </div>
                <p className="font-mono text-xs text-muted-foreground">
                  Ответ: <span className="text-primary">{room.correct_answer}</span>
                </p>
                <Button
                  onClick={onCorrect}
                  className="w-full font-orbitron text-xs uppercase bg-secondary text-secondary-foreground hover:bg-secondary/80"
                >
                  {isLast ? <><Award className="mr-1 h-4 w-4" /> Завершить миссию</> : "Отметить как пройдено →"}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {answerState === "wrong" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="rounded-md border border-destructive/40 bg-destructive/5 p-4 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-destructive" />
                  <span className="font-orbitron text-xs font-bold text-destructive">НЕВЕРНО</span>
                </div>
                <p className="font-mono text-xs text-muted-foreground">Ответ <span className="text-destructive">«{answer}»</span> не принят.</p>
                <Button variant="outline" onClick={handleRetry} className="w-full font-orbitron text-xs uppercase">
                  <RotateCcw className="mr-1 h-3 w-3" /> Попробовать снова
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
