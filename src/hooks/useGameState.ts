import { useState, useRef, useCallback } from 'react';
import { GameState, Player, Vec2, Guard, Camera, Door, Terminal, Laser, AlarmState } from '@/types/game';

export function useGameState(localPlayerId: string, initialRoomId: number = 0) {
  const [gameState, setGameState] = useState<GameState>({
    mode: 'solo',
    sessionId: null,
    roomCode: null,
    currentRoomId: initialRoomId,
    totalRooms: 20,
    players: new Map<string, Player>(),
    localPlayerId,
    isHost: true,
    guards: [],
    cameras: [],
    doors: [],
    terminals: [],
    lasers: [],
    collectibles: [],
    alarmState: 'normal',
    alarmEndsAt: 0,
    detectionLevel: 0,
    showQuiz: false,
    currentQuiz: null,
    activeHackTarget: null,
    missionStatus: 'briefing',
    startedAt: Date.now(),
    message: null,
  });

  const gameStateRef = useRef<GameState>(gameState);
  
  // Sync ref with state
  const updateGameState = useCallback((updates: Partial<GameState> | ((prev: GameState) => GameState)) => {
    setGameState(prev => {
      const next = typeof updates === 'function' ? updates(prev) : { ...prev, ...updates };
      gameStateRef.current = next;
      return next;
    });
  }, []);

  return { gameState, gameStateRef, updateGameState };
}
