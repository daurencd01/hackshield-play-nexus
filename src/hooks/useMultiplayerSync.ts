import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GameState, GameEvent, Player, Vec2 } from '@/types/game';
import { RealtimeChannel } from '@supabase/supabase-js';
import { createLogger } from '@/utils/logger';
import { AlertSystem } from '@/game/systems/AlertSystem';
import { ExfiltrationSystem } from '@/game/systems/ExfiltrationSystem';
import { ObjectiveSystem } from '@/game/systems/ObjectiveSystem';

const log = createLogger('MultiplayerSync');

export function useMultiplayerSync(
  sessionId: string | null,
  userId: string,
  username: string,
  isHost: boolean,
  gameStateRef: React.MutableRefObject<GameState>,
  updateGameState: (updates: Partial<GameState> | ((prev: GameState) => GameState)) => void
) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Рефы для троттлинга движения
  const lastMoveBroadcastTimeRef = useRef<number>(0);
  const pendingMoveTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase.channel(`game:${sessionId}`, {
      config: {
        presence: { key: userId },
        broadcast: { self: false, ack: true }
      }
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const playersMap = new Map<string, Player>(gameStateRef.current.players);
        
        let hostExists = false;
        const activePlayerIds: string[] = [];

        // Проверяем текущих игроков
        Object.entries(state).forEach(([id, presenceList]: [string, any]) => {
          const p = presenceList[0];
          activePlayerIds.push(id);
          
          if (p.is_host) {
            hostExists = true;
          }

          if (!playersMap.has(id)) {
            playersMap.set(id, {
              id,
              username: p.username || 'Hacker',
              position: p.position || { x: 50, y: 250 },
              velocity: { x: 0, y: 0 },
              health: 100,
              maxHealth: 100,
              xp: 0,
              isStealthMode: false,
              isInVent: false,
              isStunned: false,
              stunUntil: 0,
              empCharges: 1,
              keycards: [],
              facing: 0,
              color: id === userId ? '#00ff00' : '#00ffff'
            });
          }
        });

        // Удаляем отключившихся игроков
        Array.from(playersMap.keys()).forEach(id => {
            if (!state[id]) playersMap.delete(id);
        });

        updateGameState({ players: playersMap });

        // Host Migration Logic
        if (!hostExists && activePlayerIds.length > 0) {
          activePlayerIds.sort();
          const newHostId = activePlayerIds[0];

          if (newHostId === userId) {
            updateGameState({ isHost: true });
            
            channel.track({
              username,
              online_at: new Date().toISOString(),
              is_host: true,
              position: gameStateRef.current.players.get(userId)?.position || { x: 50, y: 250 }
            });

            // Resume Exfiltration if was in progress
            const activeExfil = ExfiltrationSystem.getInstance().getActiveExfil();
            if (activeExfil) {
                // Broadcast current exfil state to ensure everyone is on the same page
            }

            log.info(`Host disconnected. Successfully promoted local user "${username}" (${userId}) to HOST.`);
          }
        }
      })
      .on('broadcast', { event: 'game_event' }, ({ payload }: { payload: GameEvent }) => {
        handleRemoteEvent(payload);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            username,
            online_at: new Date().toISOString(),
            is_host: gameStateRef.current.isHost,
            position: gameStateRef.current.players.get(userId)?.position || { x: 50, y: 250 }
          });
        }
      });

    channelRef.current = channel;

    return () => {
      if (pendingMoveTimeoutRef.current) {
        clearTimeout(pendingMoveTimeoutRef.current);
      }
      channel.unsubscribe();
    };
  }, [sessionId, userId, username]);

  const handleRemoteEvent = (event: GameEvent) => {
    const currentIsHost = gameStateRef.current.isHost;
    
    switch (event.type) {
      case 'player_move':
        updateGameState(prev => {
          const players = new Map(prev.players);
          const p = players.get(event.userId);
          if (p) {
            p.position = event.position;
            p.facing = event.facing;
          }
          return { ...prev, players };
        });
        break;

      case 'world_update':
        if (!currentIsHost) {
          updateGameState({
            alarmState: event.alarmState,
            detectionLevel: event.detectionLevel
          });
          AlertSystem.getInstance().increaseAlert(event.detectionLevel - AlertSystem.getInstance().getAlertLevel());
        }
        break;

      case 'guard_update':
        if (!currentIsHost) updateGameState({ guards: event.guards });
        break;

      case 'camera_update':
        if (!currentIsHost) updateGameState({ cameras: event.cameras });
        break;
        
      case 'mission_complete':
        updateGameState({ missionStatus: 'success' });
        break;
        
      case 'mission_failed':
        updateGameState({ missionStatus: 'failed', message: event.reason });
        break;
    }
  };

  const broadcastEvent = (event: GameEvent) => {
    if (!channelRef.current) return;

    // Троттлинг отправки координат движения (20Hz / 50ms)
    if (event.type === 'player_move') {
      const now = Date.now();
      const timeSinceLast = now - lastMoveBroadcastTimeRef.current;

      if (timeSinceLast >= 50) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'game_event',
          payload: event
        });
        lastMoveBroadcastTimeRef.current = now;

        if (pendingMoveTimeoutRef.current) {
          clearTimeout(pendingMoveTimeoutRef.current);
          pendingMoveTimeoutRef.current = null;
        }
      } else {
        // Заменяем/планируем финальную отправку (trailing edge)
        if (pendingMoveTimeoutRef.current) {
          clearTimeout(pendingMoveTimeoutRef.current);
        }

        pendingMoveTimeoutRef.current = window.setTimeout(() => {
          if (channelRef.current) {
            channelRef.current.send({
              type: 'broadcast',
              event: 'game_event',
              payload: event
            });
            lastMoveBroadcastTimeRef.current = Date.now();
          }
          pendingMoveTimeoutRef.current = null;
        }, 50 - timeSinceLast);
      }
    } else {
      // Все критические события (alarm, hack, и т.д.) отправляются мгновенно
      channelRef.current.send({
        type: 'broadcast',
        event: 'game_event',
        payload: event
      });
    }
  };

  return { broadcastEvent };
}
