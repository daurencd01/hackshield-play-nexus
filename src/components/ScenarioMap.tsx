import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useMapEngine, XP_PER_ROOM } from "@/hooks/map/useMapEngine";
import { MapNode, NodeState } from "@/components/map/MapNode";
import { MapLine } from "@/components/map/MapLine";
import { RoomModal } from "@/components/map/RoomModal";

// ─── Constants ─────────────────────────────────────────────────────────────────
const NODES_PER_ROW = 3;

// ─── Types ─────────────────────────────────────────────────────────────────────
export interface ScenarioRoom {
  id: string;
  mission_id: string;
  title: string;
  task: string;
  correct_answer: string;
  order_index: number;
}

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

// ─── Main ScenarioMap ──────────────────────────────────────────────────────────
export default function ScenarioMap({ missionId, userId, onComplete }: ScenarioMapProps) {
  const {
    rooms,
    currentIndex,
    phase,
    errorMsg,
    openRoomIdx,
    setOpenRoomIdx,
    totalXP,
    handleRoomCorrect
  } = useMapEngine(missionId, userId, onComplete);

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

                  {!isLastInRow && (
                    <MapLine
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

      <div className="space-y-0">
        {renderMap()}
      </div>

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
