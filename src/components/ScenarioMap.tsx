import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Terminal, ChevronRight, CheckCircle, XCircle,
  RotateCcw, Loader2, X, Lock, Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { dataService } from "@/lib/dataService";
import { addXp } from "@/hooks/useUser";

// ─── Constants ─────────────────────────────────────────────────────────────────

const XP_PER_ROOM = 50;
const NODES_PER_ROW = 3;

function normalizeAnswer(v: string) {
  return v.trim().toLowerCase();
}

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface ScenarioRoom {
  id: string;
  mission_id: string;
  title: string;
  task: string;
  correct_answer: string;
  order_index: number;
}

type NodeState = "completed" | "current" | "locked";
type AnswerState = "idle" | "submitting" | "correct" | "wrong";

export interface ScenarioMapProps {
  missionId: string;
  userId: string;
  onComplete: (totalXp: number) => void;
}

// ─── Utility ───────────────────────────────────────────────────────────────────

function getNodeState(index: number, currentIndex: number): NodeState {
  if (index < currentIndex) return "completed";
  if (index === currentIndex) return "current";
  return "locked";
}

/** Snake layout: row-even goes left-to-right, row-odd goes right-to-left */
function snakePosition(index: number, perRow: number) {
  const row = Math.floor(index / perRow);
  const col = index % perRow;
  const flipped = row % 2 === 1;
  return { row, col: flipped ? perRow - 1 - col : col };
}

// ─── Room Modal (single-room ScenarioPlayer) ────────────────────────────────

interface RoomModalProps {
  room: ScenarioRoom;
  roomNumber: number;
  totalRooms: number;
  userId: string;
  isLast: boolean;
  onCorrect: () => void;
  onClose: () => void;
}

function RoomModal({ room, roomNumber, totalRooms, userId, isLast, onCorrect, onClose }: RoomModalProps) {
  const [answer, setAnswer] = useState("");
  const [answerState, setAnswerState] = useState<AnswerState>("idle");
  const [xpFlash, setXpFlash] = useState(false);
  const submitting = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 200);
    return () => clearTimeout(t);
  }, []);

  // Block background scroll while modal is open
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
      // Fire-and-forget DB ops
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
        className="relative w-full max-w-lg rounded-xl border border-primary/40 bg-background shadow-2xl box-glow-green overflow-hidden"
      >
        {/* Header bar */}
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

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Task */}
          <p className="font-mono text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
            {room.task}
          </p>

          {/* Input */}
          {(answerState === "idle" || answerState === "submitting") && (
            <div className="space-y-2">
              <label
                htmlFor="room-answer"
                className="font-orbitron text-[10px] font-bold uppercase tracking-wider text-secondary"
              >
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
                  {answerState === "submitting"
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <ChevronRight className="h-4 w-4" />
                  }
                </Button>
              </div>
            </div>
          )}

          {/* Correct */}
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
                  {isLast ? (
                    <><Award className="mr-1 h-4 w-4" /> Завершить миссию</>
                  ) : (
                    "Отметить как пройдено →"
                  )}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Wrong */}
          <AnimatePresence>
            {answerState === "wrong" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="rounded-md border border-destructive/40 bg-destructive/5 p-4 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-destructive" />
                  <span className="font-orbitron text-xs font-bold text-destructive">
                    НЕВЕРНО
                  </span>
                </div>
                <p className="font-mono text-xs text-muted-foreground">
                  Ответ <span className="text-destructive">«{answer}»</span> не принят.
                </p>
                <Button
                  variant="outline"
                  onClick={handleRetry}
                  className="w-full font-orbitron text-xs uppercase"
                >
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

// ─── Map Node ──────────────────────────────────────────────────────────────────

interface NodeProps {
  room: ScenarioRoom;
  index: number;
  state: NodeState;
  onClick: () => void;
}

function MapNode({ room, index, state, onClick }: NodeProps) {
  const isClickable = state !== "locked";

  const borderColor =
    state === "completed" ? "border-primary" :
    state === "current"   ? "border-secondary" :
                            "border-muted-foreground/30";

  const bgColor =
    state === "completed" ? "bg-primary/20" :
    state === "current"   ? "bg-secondary/15" :
                            "bg-muted/10";

  const iconColor =
    state === "completed" ? "text-primary" :
    state === "current"   ? "text-secondary" :
                            "text-muted-foreground/40";

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: state === "locked" ? 0.4 : 1, scale: 1 }}
      transition={{ delay: index * 0.06, type: "spring", stiffness: 260, damping: 20 }}
      whileHover={isClickable ? { scale: 1.12 } : {}}
      whileTap={isClickable ? { scale: 0.95 } : {}}
      onClick={isClickable ? onClick : undefined}
      disabled={!isClickable}
      className={`
        relative flex flex-col items-center gap-1.5
        group focus:outline-none
        ${isClickable ? "cursor-pointer" : "cursor-not-allowed"}
      `}
      title={room.title}
    >
      {/* Glow ring for current */}
      {state === "current" && (
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-secondary"
          animate={{ scale: [1, 1.35, 1], opacity: [0.8, 0, 0.8] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {/* Node circle */}
      <div
        className={`
          relative flex h-14 w-14 items-center justify-center
          rounded-full border-2 transition-all duration-300
          ${borderColor} ${bgColor}
          ${state === "current" ? "shadow-lg shadow-secondary/30" : ""}
          ${state === "completed" ? "shadow-md shadow-primary/20" : ""}
        `}
      >
        {state === "completed" ? (
          <CheckCircle className={`h-6 w-6 ${iconColor}`} />
        ) : state === "locked" ? (
          <Lock className={`h-5 w-5 ${iconColor}`} />
        ) : (
          <Terminal className={`h-6 w-6 ${iconColor}`} />
        )}

        {/* Room number badge */}
        <div className={`
          absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center
          rounded-full border text-[9px] font-orbitron font-bold
          ${state === "completed"
            ? "border-primary bg-primary text-primary-foreground"
            : state === "current"
            ? "border-secondary bg-secondary text-secondary-foreground"
            : "border-muted-foreground/30 bg-background text-muted-foreground/50"
          }
        `}>
          {index + 1}
        </div>
      </div>

      {/* Label */}
      <span className={`
        max-w-[5rem] text-center font-mono text-[9px] leading-tight
        ${state === "locked" ? "text-muted-foreground/30" : "text-muted-foreground"}
        ${state === "current" ? "text-secondary" : ""}
      `}>
        {room.title}
      </span>
    </motion.button>
  );
}

// ─── Connector line between nodes ───────────────────────────────────────────────

interface ConnectorProps {
  fromCompleted: boolean;
  reversed: boolean; // true when this segment is in a right-to-left row
}

function Connector({ fromCompleted, reversed }: ConnectorProps) {
  return (
    <div className="flex flex-1 items-center px-1">
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        style={{ transformOrigin: reversed ? "right" : "left" }}
        className={`
          h-0.5 w-full rounded-full transition-colors duration-700
          ${fromCompleted ? "bg-primary shadow-sm shadow-primary/40" : "bg-muted-foreground/20"}
        `}
      />
    </div>
  );
}

// ─── Main ScenarioMap ──────────────────────────────────────────────────────────

export default function ScenarioMap({ missionId, userId, onComplete }: ScenarioMapProps) {
  const [rooms, setRooms] = useState<ScenarioRoom[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [openRoomIdx, setOpenRoomIdx] = useState<number | null>(null);
  const [totalXP, setTotalXP] = useState(0);

  // ─── Load rooms + progress ─────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setPhase("loading");

      const [roomData, progressData] = await Promise.all([
        dataService.getScenarioRooms(missionId),
        dataService.getUserProgress(userId, missionId)
      ]);

      if (cancelled) return;

      if (!roomData?.length) {
        setErrorMsg("Задания не найдены.");
        setPhase("error");
        return;
      }

      const fetched = roomData as ScenarioRoom[];
      let resume = 0;

      if (progressData) {
        resume = progressData.completed
          ? fetched.length  // all done — allow revisiting
          : Math.min(progressData.current_room, fetched.length - 1);
      }

      setRooms(fetched);
      setCurrentIndex(resume);
      setPhase("ready");
    };

    load();
    return () => { cancelled = true; };
  }, [missionId, userId]);

  // ─── Room answered correctly ────────────────────────────────────────────────
  const handleRoomCorrect = useCallback(() => {
    const newXP = totalXP + XP_PER_ROOM;
    setTotalXP(newXP);
    const nextIdx = currentIndex + 1;

    if (currentIndex >= rooms.length - 1) {
      // Mission complete
      setCurrentIndex(rooms.length); // mark all done
      setOpenRoomIdx(null);
      onComplete(newXP);
    } else {
      setCurrentIndex(nextIdx);
      setOpenRoomIdx(null);
    }
  }, [currentIndex, rooms.length, totalXP, onComplete]);

  // ─── Snake layout rendering ─────────────────────────────────────────────────
  const renderMap = () => {
    const rows: ScenarioRoom[][] = [];
    for (let i = 0; i < rooms.length; i += NODES_PER_ROW) {
      rows.push(rooms.slice(i, i + NODES_PER_ROW));
    }

    return rows.map((rowRooms, rowIdx) => {
      const reversed = rowIdx % 2 === 1;
      const displayRooms = reversed ? [...rowRooms].reverse() : rowRooms;
      const globalStartIdx = rowIdx * NODES_PER_ROW;

      return (
        <div key={rowIdx} className="flex w-full flex-col gap-4">
          {/* Node row */}
          <div className="flex items-center justify-between gap-0">
            {displayRooms.map((room, localIdx) => {
              const globalIdx = reversed
                ? globalStartIdx + (rowRooms.length - 1 - localIdx)
                : globalStartIdx + localIdx;

              const nodeState = getNodeState(globalIdx, currentIndex);
              const isLastInRow = localIdx === displayRooms.length - 1;

              return (
                <div key={room.id} className="flex flex-1 items-center">
                  <div className="flex flex-col items-center">
                    <MapNode
                      room={room}
                      index={globalIdx}
                      state={nodeState}
                      onClick={() => setOpenRoomIdx(globalIdx)}
                    />
                  </div>

                  {/* Connector to next node in this row */}
                  {!isLastInRow && (
                    <Connector
                      fromCompleted={nodeState === "completed"}
                      reversed={reversed}
                    />
                  )}
                </div>
              );
            })}

            {/* Pad incomplete rows to maintain alignment */}
            {rowRooms.length < NODES_PER_ROW &&
              Array.from({ length: NODES_PER_ROW - rowRooms.length }).map((_, i) => (
                <div key={`pad-${i}`} className="flex-1" />
              ))
            }
          </div>

          {/* Vertical turn connector between rows */}
          {rowIdx < rows.length - 1 && (
            <div className={`flex w-full ${reversed ? "justify-start pl-6" : "justify-end pr-6"}`}>
              <motion.div
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.35, delay: 0.3 + rowIdx * 0.1 }}
                style={{ transformOrigin: "top" }}
                className={`h-8 w-0.5 rounded-full ${currentIndex > (rowIdx + 1) * NODES_PER_ROW - 1 ? "bg-primary" : "bg-muted-foreground/20"}`}
              />
            </div>
          )}
        </div>
      );
    });
  };

  // ─── Renders ────────────────────────────────────────────────────────────────

  if (phase === "loading") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="font-mono text-sm text-muted-foreground">Загрузка карты миссии...</p>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="mx-auto max-w-md rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-center">
        <p className="font-mono text-sm text-destructive">{errorMsg}</p>
      </div>
    );
  }

  const openRoom = openRoomIdx !== null ? rooms[openRoomIdx] : null;

  return (
    <div className="mx-auto max-w-lg">
      {/* ── XP counter ──────────────────────────────────────────────────────── */}
      <div className="mb-6 flex items-center justify-between font-mono text-xs text-muted-foreground">
        <span>
          ПРОЙДЕНО: {Math.min(currentIndex, rooms.length)} / {rooms.length}
        </span>
        <motion.span
          key={totalXP}
          initial={{ scale: 1.4, color: "#facc15" }}
          animate={{ scale: 1, color: "#facc15" }}
          className="font-orbitron text-xs font-bold text-neon-yellow"
        >
          +{totalXP} XP
        </motion.span>
      </div>

      {/* ── Snake map ───────────────────────────────────────────────────────── */}
      <div className="space-y-0">
        {renderMap()}
      </div>

      {/* ── Hint ────────────────────────────────────────────────────────────── */}
      {currentIndex < rooms.length && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-6 text-center font-mono text-[10px] text-muted-foreground/50"
        >
          ↑ Нажми на текущую комнату, чтобы начать
        </motion.p>
      )}

      {/* ── Room modal ───────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {openRoom && openRoomIdx !== null && (
          <RoomModal
            room={openRoom}
            roomNumber={openRoomIdx + 1}
            totalRooms={rooms.length}
            userId={userId}
            isLast={openRoomIdx >= rooms.length - 1}
            onCorrect={handleRoomCorrect}
            onClose={() => setOpenRoomIdx(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
