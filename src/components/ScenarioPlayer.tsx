import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Terminal,
  ChevronRight,
  Award,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  RotateCcw,
  LogIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { addXp } from "@/hooks/useUser";

// ─── Constants ─────────────────────────────────────────────────────────────────

/** XP awarded per correctly answered room. Easy to adjust later. */
const XP_PER_ROOM = 50;

/**
 * Normalize an answer string for comparison.
 * Centralised here so the algorithm can be swapped (e.g. hashing) without
 * touching call sites.
 */
function normalizeAnswer(value: string): string {
  return value.trim().toLowerCase();
}

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ScenarioRoom {
  id: string;
  mission_id: string;
  title: string;
  task: string;
  /** Plain-text for now; swap normalizeAnswer() to add hashing later */
  correct_answer: string;
  order_index: number;
}

type AnswerState = "idle" | "submitting" | "correct" | "wrong";

export interface ScenarioPlayerProps {
  missionId: string;
  onComplete: (totalXp: number) => void;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function ScenarioPlayer({ missionId, onComplete }: ScenarioPlayerProps) {
  const navigate = useNavigate();

  // ── Auth ──────────────────────────────────────────────────────────────────────
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  // undefined  → not yet resolved
  // null       → resolved, unauthenticated
  // string     → resolved, authenticated

  // ── Data ──────────────────────────────────────────────────────────────────────
  const [rooms, setRooms] = useState<ScenarioRoom[]>([]);
  const [currentRoomIndex, setCurrentRoomIndex] = useState(0);
  const [totalXP, setTotalXP] = useState(0);

  // ── UI state ──────────────────────────────────────────────────────────────────
  /** 'init' covers both auth resolution and data fetching phases */
  const [phase, setPhase] = useState<"init" | "playing" | "error">("init");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [answerState, setAnswerState] = useState<AnswerState>("idle");

  // Guard against double-submit (ref so it doesn't trigger re-renders)
  const submitting = useRef(false);

  // Input ref for auto-focus on room change
  const inputRef = useRef<HTMLInputElement>(null);

  // ─── Step 1: Resolve auth ────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const resolveAuth = async () => {
      // getUser() hits the Supabase Auth server — authoritative, no stale JWT
      const { data: { user }, error } = await supabase.auth.getUser();

      if (cancelled) return;

      if (error || !user) {
        setUserId(null);
        return;
      }

      setUserId(user.id);
    };

    resolveAuth();
    return () => { cancelled = true; };
  }, []);

  // ─── Step 2: Fetch rooms + resume progress (runs after auth resolves) ─────────
  useEffect(() => {
    // Wait until auth is resolved (not undefined)
    if (userId === undefined) return;

    let cancelled = false;

    const init = async () => {
      setPhase("init");
      setErrorMsg(null);

      // ── 2a. Fetch rooms ───────────────────────────────────────────────────────
      const { data: roomData, error: roomError } = await supabase
        .from("scenario_rooms")
        .select("id, mission_id, title, task, correct_answer, order_index")
        .eq("mission_id", missionId)
        .order("order_index", { ascending: true });

      if (cancelled) return;

      if (roomError) {
        console.error("[ScenarioPlayer] Failed to fetch rooms:", roomError);
        setErrorMsg(`Не удалось загрузить задания: ${roomError.message}`);
        setPhase("error");
        return;
      }

      if (!roomData || roomData.length === 0) {
        setErrorMsg("Задания для этой миссии не найдены.");
        setPhase("error");
        return;
      }

      const fetchedRooms = roomData as ScenarioRoom[];

      // ── 2b. Resume saved progress (authenticated users only) ─────────────────
      let resumeIndex = 0;

      if (userId) {
        const { data: progressData, error: progressError } = await supabase
          .from("user_progress")
          .select("current_room, completed")
          .eq("user_id", userId)
          .eq("mission_id", missionId)
          .maybeSingle();

        if (progressError) {
          // Non-fatal: log and start from 0
          console.warn("[ScenarioPlayer] Could not load progress:", progressError.message);
        } else if (progressData) {
          if (progressData.completed) {
            // Mission already completed — restart from beginning
            resumeIndex = 0;
          } else {
            // Clamp to valid range in case rooms were added/removed
            resumeIndex = Math.min(progressData.current_room, fetchedRooms.length - 1);
          }
        }
      }

      if (cancelled) return;

      setRooms(fetchedRooms);
      setCurrentRoomIndex(resumeIndex);
      setPhase("playing");
    };

    init();
    return () => { cancelled = true; };
  }, [userId, missionId]);

  // ─── Auto-focus input when room changes ──────────────────────────────────────
  useEffect(() => {
    if (phase === "playing") {
      // Small delay to let AnimatePresence finish before focus
      const t = setTimeout(() => inputRef.current?.focus(), 350);
      return () => clearTimeout(t);
    }
  }, [currentRoomIndex, phase]);

  // ─── Derived values (safe after rooms loaded) ─────────────────────────────────
  const currentRoom = rooms[currentRoomIndex] ?? null;
  const isLastRoom = currentRoomIndex >= rooms.length - 1;

  // ─── Save progress (fire-and-forget with error logging) ───────────────────────
  const saveProgress = useCallback(
    async (roomIndex: number, completed: boolean) => {
      if (!userId) return; // Guests: skip silently

      const { error } = await supabase.from("user_progress").upsert(
        {
          user_id: userId,
          mission_id: missionId,
          current_room: roomIndex,
          completed,
        },
        { onConflict: "user_id,mission_id" }
      );

      if (error) {
        console.error("[ScenarioPlayer] Failed to save progress:", error.message);
      }
    },
    [userId, missionId]
  );

  // ─── Award XP for the current room ───────────────────────────────────────────
  const awardRoomXp = useCallback(async () => {
    if (!userId) return;

    const earned = await addXp(userId, XP_PER_ROOM);
    if (earned === null) {
      console.warn("[ScenarioPlayer] XP update failed (non-fatal).");
    }
  }, [userId]);

  // ─── Handle answer submission ──────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!currentRoom) return;
    if (answerState !== "idle") return;
    if (submitting.current) return; // double-click guard

    const trimmed = answer.trim();
    if (!trimmed) return; // prevent whitespace-only bypass

    submitting.current = true;
    setAnswerState("submitting");

    const isCorrect = normalizeAnswer(trimmed) === normalizeAnswer(currentRoom.correct_answer);

    if (isCorrect) {
      // Award XP immediately on correct answer — don't wait for mission end
      const newTotal = totalXP + XP_PER_ROOM;
      setTotalXP(newTotal);

      // Run DB operations in parallel — non-blocking for UI
      await Promise.allSettled([
        awardRoomXp(),
        saveProgress(currentRoomIndex, isLastRoom),
      ]);

      setAnswerState("correct");
    } else {
      setAnswerState("wrong");
    }

    submitting.current = false;
  }, [
    answer,
    answerState,
    currentRoom,
    currentRoomIndex,
    isLastRoom,
    totalXP,
    awardRoomXp,
    saveProgress,
  ]);

  // ─── Advance to next room (or complete mission) ───────────────────────────────
  const handleNext = useCallback(async () => {
    if (isLastRoom) {
      onComplete(totalXP);
    } else {
      const nextIndex = currentRoomIndex + 1;
      setCurrentRoomIndex(nextIndex);
      setAnswer("");
      setAnswerState("idle");
    }
  }, [isLastRoom, currentRoomIndex, totalXP, onComplete]);

  // ─── Retry wrong answer ────────────────────────────────────────────────────────
  const handleRetry = useCallback(() => {
    setAnswer("");
    setAnswerState("idle");
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  // ─── Keyboard: Enter to submit ────────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && answerState === "idle") {
        handleSubmit();
      }
    },
    [answerState, handleSubmit]
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // Renders
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Render: Auth loading / init ───────────────────────────────────────────────
  if (userId === undefined || phase === "init") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="font-mono text-sm text-muted-foreground">Загрузка миссии...</p>
      </div>
    );
  }

  // ── Render: Unauthenticated ────────────────────────────────────────────────────
  if (userId === null) {
    return (
      <div className="mx-auto max-w-md rounded-lg border border-border bg-card/60 p-8 text-center">
        <LogIn className="mx-auto mb-3 h-10 w-10 text-secondary" />
        <h2 className="font-orbitron text-lg font-bold text-foreground">Требуется авторизация</h2>
        <p className="mt-2 font-mono text-sm text-muted-foreground">
          Войди в аккаунт, чтобы играть в сценарные миссии.
        </p>
        <Button
          onClick={() => navigate("/auth")}
          className="mt-6 font-orbitron text-xs uppercase bg-secondary text-secondary-foreground hover:bg-secondary/80"
        >
          Войти
        </Button>
      </div>
    );
  }

  // ── Render: Error ──────────────────────────────────────────────────────────────
  if (phase === "error" || !currentRoom) {
    return (
      <div className="mx-auto max-w-lg rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-center">
        <AlertCircle className="mx-auto mb-3 h-8 w-8 text-destructive" />
        <p className="font-mono text-sm text-destructive">
          {errorMsg ?? "Произошла неизвестная ошибка."}
        </p>
        <Button
          variant="outline"
          onClick={() => navigate("/missions")}
          className="mt-4 font-orbitron text-xs uppercase"
        >
          Назад к миссиям
        </Button>
      </div>
    );
  }

  // ── Render: Main game ──────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-2xl space-y-5">

      {/* ── Progress header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between font-mono text-xs text-muted-foreground">
        <span>КОМНАТА: {currentRoomIndex + 1} / {rooms.length}</span>
        <span className="text-neon-yellow">+{totalXP} XP заработано</span>
      </div>

      {/* ── Progress track ──────────────────────────────────────────────────── */}
      <div className="flex gap-1">
        {rooms.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-500 ${
              i < currentRoomIndex
                ? "bg-primary"
                : i === currentRoomIndex
                ? "bg-secondary animate-pulse-glow"
                : "bg-muted"
            }`}
          />
        ))}
      </div>

      {/* ── Room card ───────────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentRoom.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="rounded-lg border border-primary/40 bg-card/60 p-5 box-glow-green"
        >
          {/* Header */}
          <div className="mb-4 flex items-center gap-2">
            <Terminal className="h-5 w-5 shrink-0 text-primary" />
            <span className="font-orbitron text-xs font-bold uppercase tracking-wider text-primary">
              {currentRoom.title}
            </span>
            <span className="ml-auto shrink-0 font-mono text-[10px] uppercase text-muted-foreground">
              [ЗАДАНИЕ {currentRoomIndex + 1}]
            </span>
          </div>

          {/* Task */}
          <p className="mb-5 font-mono text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
            {currentRoom.task}
          </p>

          {/* ── Input area (idle + submitting) ── */}
          {(answerState === "idle" || answerState === "submitting") && (
            <div className="space-y-3">
              <label
                htmlFor="scenario-answer"
                className="font-orbitron text-xs font-bold uppercase tracking-wider text-secondary"
              >
                Введи ответ:
              </label>
              <div className="flex gap-2">
                <input
                  id="scenario-answer"
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
                  aria-label="Подтвердить ответ"
                  className="font-orbitron text-xs uppercase bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-40"
                >
                  {answerState === "submitting" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* ── Correct feedback ── */}
          {answerState === "correct" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="rounded-md border border-primary/40 bg-primary/5 p-4"
            >
              <div className="mb-1 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 shrink-0 text-primary" />
                <span className="font-orbitron text-xs font-bold text-primary">
                  ВЕРНО! +{XP_PER_ROOM} XP
                </span>
              </div>
              <p className="font-mono text-xs text-muted-foreground">
                Правильный ответ:{" "}
                <span className="text-primary">{currentRoom.correct_answer}</span>
              </p>
            </motion.div>
          )}

          {/* ── Wrong feedback ── */}
          {answerState === "wrong" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="rounded-md border border-destructive/40 bg-destructive/5 p-4"
            >
              <div className="mb-1 flex items-center gap-2">
                <XCircle className="h-4 w-4 shrink-0 text-destructive" />
                <span className="font-orbitron text-xs font-bold text-destructive">
                  НЕВЕРНО — попробуй ещё раз
                </span>
              </div>
              <p className="font-mono text-xs text-muted-foreground">
                Ответ{" "}
                <span className="text-destructive">«{answer}»</span>{" "}
                не принят. Перечитай задание внимательно.
              </p>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* ── Action buttons ────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {answerState === "wrong" && (
          <motion.div
            key="retry"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex justify-end"
          >
            <Button
              variant="outline"
              onClick={handleRetry}
              className="font-orbitron text-xs uppercase"
            >
              <RotateCcw className="mr-1 h-3 w-3" />
              Попробовать снова
            </Button>
          </motion.div>
        )}

        {answerState === "correct" && (
          <motion.div
            key="next"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex justify-end"
          >
            <Button
              onClick={handleNext}
              className="font-orbitron text-xs uppercase bg-secondary text-secondary-foreground hover:bg-secondary/80"
            >
              {isLastRoom ? (
                <>
                  <Award className="mr-1 h-4 w-4" />
                  Завершить миссию
                </>
              ) : (
                "Следующая комната →"
              )}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
