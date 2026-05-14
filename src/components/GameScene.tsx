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
import { ROOM_PROGRESSION } from '@/data/gameData';
import { useGameProgress } from '@/hooks/useGameProgress';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingScreen } from './LoadingScreen';
import { quizService } from '@/services/quizService';

interface ScenarioRoom {
  id: string; mission_id: string; title: string;
  task: string; correct_answer: string; order_index: number;
}

interface GameSceneProps {
  missionId?: string;
  userId?: string;
  onComplete?: (totalXp: number) => void;
}

export default function GameScene({ missionId = "m1", onComplete }: GameSceneProps) {
  const { user } = useAuth();
  const userId = user?.id || "u1";
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gs = useGameState();
  const { progress, loading: progressLoading, saveProgress, completeRoom } = useGameProgress(missionId);

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

  // Load Rooms and Sync Progress
  useEffect(() => {
    if (progressLoading) return;

    const load = async () => {
      try {
        const rd = await dataService.getScenarioRooms(missionId);
        if (!rd?.length) { setPhase("error"); return; }
        setRooms(rd);
        
        // Initial room content
        const startIdx = progress?.current_room_index || 0;
        setRoomIdx(startIdx);
        gs.current.roomIdx = startIdx;
        
        // Fetch Quiz for current room
        const config = ROOM_PROGRESSION[startIdx] || ROOM_PROGRESSION[0];
        const quizzes = await quizService.getByFilter({ difficulty: config.difficulty });
        const roomQuiz = quizzes.length > 0 ? quizzes[Math.floor(Math.random() * quizzes.length)] : undefined;
        
        gs.current.objects = generateRoomContent(startIdx, CW, CH, roomQuiz);

        if (progress) {
          gs.current.health = progress.health;
          gs.current.sessionXp = progress.session_xp;
          gs.current.flags = progress.flags;
          gs.current.hasKeyCard = progress.has_key_card;
          setTotalXP(progress.total_xp_earned);
        }

        setPhase("playing");
      } catch (err) {
        console.error(err);
        setPhase("error");
      }
    };
    load();
  }, [missionId, gs, progress, progressLoading]);

  // Автосейв каждые 10 сек
  useEffect(() => {
    if (phase !== 'playing') return;

    const interval = setInterval(() => {
      saveProgress({
        current_room_index: gs.current.roomIdx,
        health: gs.current.health,
        session_xp: gs.current.sessionXp,
        flags: gs.current.flags,
        has_key_card: gs.current.hasKeyCard
      });
    }, 10000);

    return () => clearInterval(interval);
  }, [saveProgress, phase, gs]);

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
    
    // Save progress when moving to next room
    completeRoom(roomIdx, gs.current.sessionXp);

    // Prepare next room quiz
    quizService.getByFilter({ difficulty: config.difficulty }).then(quizzes => {
      const nextQuiz = quizzes.length > 0 ? quizzes[Math.floor(Math.random() * quizzes.length)] : undefined;
      
      setTimeout(() => {
        setRoomIdx(nextIdx);
        gs.current.roomIdx = nextIdx;
        gs.current.objects = generateRoomContent(nextIdx, CW, CH, nextQuiz);
        gs.current.playerTarget = gs.current.playerRender = { x: WALL + 40, y: CH / 2 };
        gs.current.hasKeyCard = false;
        gs.current.alarmActive = false;
        gs.current.transitioning = false;
      }, 400);
    });
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
  if (phase === "loading" || progressLoading) {
    return <LoadingScreen />;
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
      <div className="relative group rounded-xl overflow-hidden border border-[#00ff88]/20 bg-black shadow-2xl w-full h-full">
        <canvas
          ref={canvasRef}
          className="cursor-none block w-full h-full"
          style={{
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
      {isMobile && (
        <div className="fixed inset-0 pointer-events-none z-40">
          <div className="pointer-events-auto">
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
                if ('vibrate' in navigator) navigator.vibrate(10);
              }}
              isCrouching={gs.current.isCrouching}
              hasInteraction={gs.current.nearbyIdx !== null}
            />
          </div>
        </div>
      )}

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
