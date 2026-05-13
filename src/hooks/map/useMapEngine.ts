import { useState, useEffect, useCallback } from "react";
import { dataService } from "@/lib/dataService";
import { ScenarioRoom } from "@/components/ScenarioMap";

export const XP_PER_ROOM = 50;

export function useMapEngine(missionId: string, userId: string, onComplete: (totalXp: number) => void) {
  const [rooms, setRooms] = useState<ScenarioRoom[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [openRoomIdx, setOpenRoomIdx] = useState<number | null>(null);
  const [totalXP, setTotalXP] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setPhase("loading");
      try {
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
            ? fetched.length 
            : Math.min(progressData.currentRoomIndex ?? 0, fetched.length - 1);
        }

        setRooms(fetched);
        setCurrentIndex(resume);
        setPhase("ready");
      } catch (err) {
        if (!cancelled) {
          setErrorMsg("Ошибка загрузки данных.");
          setPhase("error");
        }
      }
    };

    load();
    return () => { cancelled = true; };
  }, [missionId, userId]);

  const handleRoomCorrect = useCallback(() => {
    const newXP = totalXP + XP_PER_ROOM;
    setTotalXP(newXP);
    const nextIdx = currentIndex + 1;

    if (currentIndex >= rooms.length - 1) {
      setCurrentIndex(rooms.length);
      setOpenRoomIdx(null);
      onComplete(newXP);
    } else {
      setCurrentIndex(nextIdx);
      setOpenRoomIdx(null);
    }
  }, [currentIndex, rooms.length, totalXP, onComplete]);

  return {
    rooms,
    currentIndex,
    phase,
    errorMsg,
    openRoomIdx,
    setOpenRoomIdx,
    totalXP,
    handleRoomCorrect
  };
}
