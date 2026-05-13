import { useEffect, useRef, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Award, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { dataService } from "@/lib/dataService";
import { addXp } from "@/hooks/useUser";
import TaskModal from "./TaskModal";
import { VirtualJoystick, ActionButtons } from "./TouchControls";
import { FrequencyHack, MemoryHack } from "./HackingMinigames";
import { haptic } from "@/utils/haptic";

import { useGameState, CW, CH, WALL } from './game/useGameState';
import { useInputHandler } from './game/useInputHandler';
import { useGameLoop } from './game/useGameLoop';
import { SFX, addLog, spawnHackEffect, triggerAlarm, INTERACT_COOLDOWN, INTERACT_DIST } from './game/gameLogic';
import { GameObject, ObjectType, generateRoomContent } from '@/data/roomGenerator';
import { handleInteraction } from '@/data/interactionHandler';
import { ROOM_PROGRESSION } from '@/data/russianTasks';

interface ScenarioRoom {
  id: string; mission_id: string; title: string;
  task: string; correct_answer: string; order_index: number;
}

interface GameSceneProps {
  missionId?: string;
  userId?: string;
  onComplete?: (totalXp: number) => void;
}

export default function GameScene({ missionId = "m1", userId = "u1", onComplete }: GameSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gs = useGameState();

  // React state
  const [isMobile, setIsMobile] = useState(false);
  const [hackingObj, setHackingObj] = useState<GameObject | null>(null);
  const [rooms, setRooms] = useState<ScenarioRoom[]>([]);
  const [roomIdx, setRoomIdx] = useState(0);
  const [totalXP, setTotalXP] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeType, setActiveType] = useState<ObjectType | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [phase, setPhase] = useState<"loading" | "playing" | "error">("loading");
  
  const joystickInput = useRef({ x: 0, y: 0 });

  // Init mobile check
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load Rooms
  useEffect(() => {
    const load = async () => {
      try {
        const rd = await dataService.getScenarioRooms(missionId);
        if (!rd?.length) { setPhase("error"); return; }
        setRooms(rd);
        
        // Initial room content
        gs.current.objects = generateRoomContent(0, CW, CH);
        setPhase("playing");
      } catch (err) {
        console.error(err);
        setPhase("error");
      }
    };
    load();
  }, [missionId, gs]);

  // Modals & Progress
  const closeModal = () => {
    gs.current.modalOpen = false;
    setModalOpen(false);
    setHackingObj(null);
  };

  const advanceRoom = useCallback(() => {
    if (roomIdx >= rooms.length - 1) {
      if (onComplete) onComplete(totalXP + gs.current.sessionXp);
      addXp(userId, totalXP + gs.current.sessionXp);
      return;
    }

    const nextIdx = roomIdx + 1;
    const config = ROOM_PROGRESSION[nextIdx] || ROOM_PROGRESSION[ROOM_PROGRESSION.length - 1];
    
    gs.current.transitioning = true;
    setTimeout(() => {
      setRoomIdx(nextIdx);
      gs.current.objects = generateRoomContent(nextIdx, CW, CH);
      gs.current.playerTarget = gs.current.playerRender = { x: WALL + 40, y: CH / 2 };
      gs.current.hasKeyCard = false;
      gs.current.alarmActive = false;
      gs.current.transitioning = false;
    }, 400);
  }, [roomIdx, rooms, totalXP, userId, onComplete, gs]);

  const handleCorrect = useCallback(() => {
    const g = gs.current;
    const obj = g.objects.find(o => o.type === activeType && !o.completed);
    if (obj) {
      obj.completed = true;
      obj.hacked = true;
      spawnHackEffect(g, obj);
      SFX.success(g);
      if (obj.task) {
        setTotalXP(p => p + obj.task!.xpReward);
        addLog(g, `TASK COMPLETED: +${obj.task!.xpReward} XP`, "#00ff88");
      }
    }

    // Check if room cleared
    const remaining = g.objects.filter(o => o.task && !o.completed);
    if (remaining.length === 0) {
      const door = g.objects.find(o => o.type === 'door' || o.type === 'locked_door');
      if (door) {
        door.completed = true;
        g.doorOpenAnim = 0;
        SFX.doorOpen(g);
        addLog(g, "DOOR UNLOCKED", "#00ff88");
      }
    }
    closeModal();
  }, [activeType, gs]);

  const triggerInteract = useCallback((ni: number) => {
    const obj = gs.current.objects[ni];
    const res = handleInteraction(obj, gs.current.hasKeyCard);
    
    if (res.type === 'open_task') {
      SFX.interact(gs.current);
      if (obj.type === 'camera') {
        setHackingObj(obj);
        gs.current.modalOpen = true;
        setActiveType('camera');
      } else {
        gs.current.modalOpen = true;
        gs.current.interactCooldown = INTERACT_COOLDOWN;
        setActiveType(obj.type as any);
        setModalOpen(true);
      }
    } else if (res.type === 'next_room') {
      SFX.interact(gs.current);
      advanceRoom();
    }
  }, [gs, advanceRoom]);

  // Hooks
  useInputHandler(gs, () => {
    const ni = gs.current.nearbyIdx;
    if (ni !== null) triggerInteract(ni);
  }, isMobile, joystickInput);

  useGameLoop(gs, canvasRef, phase, roomIdx, rooms.length, totalXP);

  // Render Logic
  if (phase === "loading") {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] bg-black/40 rounded-lg border border-white/5">
        <Loader2 className="w-10 h-10 text-[#00ff88] animate-spin mb-4" />
        <p className="font-orbitron text-sm text-[#00ff88] animate-pulse">INITIALIZING NEURAL LINK...</p>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] bg-red-950/20 rounded-lg border border-red-500/20 p-8 text-center">
        <X className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="font-orbitron text-lg text-red-400 mb-2">SYSTEM FAILURE</h3>
        <p className="text-sm text-red-400/60 max-w-xs">Critical error in mission sequence. Connection lost.</p>
        <Button onClick={() => window.location.reload()} variant="outline" className="mt-6 border-red-500/50 text-red-400 hover:bg-red-500/10">
          REBOOT SYSTEM
        </Button>
      </div>
    );
  }

  const activeObj = gs.current?.objects.find(o => o.type === activeType && !o.completed && o.task);
  const currentTask = activeObj?.task || null;

  return (
    <div className="flex flex-col items-center gap-4 relative">
      <div className="relative group rounded-xl overflow-hidden border border-[#00ff88]/20 bg-black shadow-2xl">
        <canvas
          ref={canvasRef}
          className="cursor-none block"
          style={{
            maxWidth: CW,
            width: "100%",
            boxShadow: gs.current.alarmActive ? "0 0 40px rgba(255,0,0,0.15)" : "none"
          }}
        />
        
        {/* Transition Overlay */}
        <motion.div
          animate={{ opacity: gs.current.transitioning ? 1 : 0 }}
          className="absolute inset-0 bg-black z-50 pointer-events-none flex items-center justify-center"
        >
          <div className="text-[#00ff88] font-orbitron text-xl tracking-[0.5em] animate-pulse">
            LOADING SECTOR...
          </div>
        </motion.div>
      </div>

      {/* Hacking Overlay */}
      <AnimatePresence>
        {hackingObj && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          >
            <div className="max-w-md w-full">
              {hackingObj.type === 'camera' ? (
                <FrequencyHack
                  onSuccess={() => {
                    hackingObj.hacked = true;
                    hackingObj.completed = true;
                    SFX.success(gs.current);
                    closeModal();
                  }}
                  onFail={() => {
                    SFX.error(gs.current);
                    triggerAlarm(gs.current, hackingObj.id);
                    closeModal();
                  }}
                />
              ) : (
                <MemoryHack
                  onSuccess={() => {
                    hackingObj.hacked = true;
                    hackingObj.completed = true;
                    SFX.success(gs.current);
                    closeModal();
                  }}
                  onFail={() => {
                    SFX.error(gs.current);
                    closeModal();
                  }}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Controls */}
        <div className="w-full max-w-[640px] px-4 flex items-center justify-between mt-4 pb-8">
          <VirtualJoystick 
            onMove={(dx, dy) => {
              gs.current.keys.up = dy < -0.3;
              gs.current.keys.down = dy > 0.3;
              gs.current.keys.left = dx < -0.3;
              gs.current.keys.right = dx > 0.3;
            }}
            onStop={() => {
              gs.current.keys.up = false;
              gs.current.keys.down = false;
              gs.current.keys.left = false;
              gs.current.keys.right = false;
            }}
          />
          <ActionButtons
            onAction={() => {
              const ni = gs.current.nearbyIdx;
              if (ni !== null) triggerInteract(ni);
            }}
            onCrouch={() => {
              gs.current.isCrouching = !gs.current.isCrouching;
              haptic.impact();
            }}
            isCrouching={gs.current.isCrouching}
            hasInteraction={gs.current.nearbyIdx !== null}
          />
        </div>

      {/* Task Modal */}
      <AnimatePresence>
        {modalOpen && currentTask && (
          <TaskModal
            room={currentTask}
            roomIndex={roomIdx}
            totalRooms={rooms.length}
            userId={userId}
            missionId={missionId}
            isLast={roomIdx >= rooms.length - 1}
            onCorrect={handleCorrect}
            onClose={closeModal}
            onSuccess={() => SFX.success(gs.current)}
            onError={() => SFX.error(gs.current)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
