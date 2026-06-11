import { useCallback, useRef } from 'react';
import { GameState, Guard, Camera, Player, Vec2 } from '@/types/game';
import { isPointInFOV, checkRaycast } from '@/utils/visibility';
import { findPath } from '@/utils/pathfinding';
import { AlertSystem } from '@/game/systems/AlertSystem';
import { SkillSystem } from '@/game/systems/SkillSystem';

export function useGameAI() {
  // Кеш путей для каждого охранника во избежание просадок FPS
  const guardPathsRef = useRef<Map<string, {
    path: Vec2[];
    target: Vec2;
    lastCalculated: number;
  }>>(new Map());

  const updateAI = useCallback((gs: GameState, deltaTime: number, walls: any[], shadows: any[]) => {
    if (!gs.isHost) return; // Only host updates AI

    const players = Array.from(gs.players.values());

    // Update Cameras
    gs.cameras.forEach(camera => {
      if (camera.state !== 'active') {
          if (Date.now() > camera.hackedUntil) camera.state = 'active';
          return;
      }

      // Sweep animation
      const rotationMultiplier = AlertSystem.getInstance().getCameraRotationMultiplier();
      camera.rotationAngle += camera.rotationSpeed * rotationMultiplier * (deltaTime / 16.67);
      const [min, max] = camera.rotationRange;
      if (camera.rotationAngle > max || camera.rotationAngle < min) {
          camera.rotationSpeed *= -1;
      }

      let detectedPlayer = false;
      for (const player of players) {
          if (player.isInVent) continue;
          
          if (isPointInFOV(player.position, camera.position, camera.rotationAngle, camera.visionFOV, camera.visionRange)) {
              if (checkRaycast(camera.position, player.position, walls)) {
                  camera.detectionTimer += deltaTime;
                  detectedPlayer = true;
                  if (camera.detectionTimer > 1500) { // 1.5 seconds
                      gs.alarmState = 'triggered';
                      gs.alarmEndsAt = Date.now() + 30000;
                  }
              }
          }
      }
      if (!detectedPlayer) {
          // Плавный сброс детекции вместо резкого сброса (Medium-3)
          camera.detectionTimer = Math.max(0, camera.detectionTimer - deltaTime * 0.5);
      }
    });

    // Функция умного перемещения по путям A*
    const moveGuardWithPathfinding = (
      guard: Guard,
      target: Vec2,
      speed: number
    ) => {
      const now = Date.now();
      const cacheKey = guard.id;
      let cache = guardPathsRef.current.get(cacheKey);

      // Пересчитываем путь, если его нет, если цель сместилась или прошло 500мс
      const targetMoved = !cache || dist(cache.target, target) > 15;
      const cacheExpired = !cache || now - cache.lastCalculated > 500;

      if (!cache || targetMoved || cacheExpired) {
        const path = findPath(guard.position, target, walls);
        cache = {
          path,
          target: { ...target },
          lastCalculated: now
        };
        guardPathsRef.current.set(cacheKey, cache);
      }

      if (cache.path && cache.path.length > 1) {
        // Пропускаем стартовый узел (центр текущей клетки) и любые слишком близкие точки,
        // иначе охранник бесконечно идёт к центру собственной клетки и стоит на месте.
        let nextPointIndex = 1;
        while (nextPointIndex < cache.path.length && dist(guard.position, cache.path[nextPointIndex]) < 14) {
          nextPointIndex++;
        }

        if (nextPointIndex < cache.path.length) {
          const nextPoint = cache.path[nextPointIndex];
          moveTowards(guard, nextPoint, speed);
          return;
        }
      }

      // Fallback на прямое движение, если путь не найден
      moveTowards(guard, target, speed);
    };

    // Update Guards
    gs.guards.forEach(guard => {
      if (guard.state === 'stunned') return;

      let bestTarget: Player | null = null;
      let maxDetection = 0;

      for (const player of players) {
          if (player.isInVent) continue;

          const detectionRange = guard.visionRange * SkillSystem.getInstance().getGuardDetectionRangeMultiplier();
          const inFOV = isPointInFOV(player.position, guard.position, guard.visionAngle, guard.visionFOV, detectionRange);
          const visible = inFOV && checkRaycast(guard.position, player.position, walls);
          
          // Stealth / Shadow check
          const inShadow = shadows.some(s => 
              player.position.x > s.x && player.position.x < s.x + s.w &&
              player.position.y > s.y && player.position.y < s.y + s.h
          );
          
          const isHidden = (inShadow || player.isStealthMode) && 
                           dist(player.position, guard.position) > 50;

          if (visible && !isHidden) {
              guard.alertLevel += 2; // Rapid accumulation
              AlertSystem.getInstance().increaseAlert(0.5); // Global alert accumulation
              if (guard.alertLevel >= 100) {
                  guard.state = 'chase';
                  guard.lastSeenPlayerPos = { ...player.position };
                  bestTarget = player;
              } else if (guard.state === 'patrol') {
                  guard.state = 'alert';
                  guard.lastSeenPlayerPos = { ...player.position };
              }
          }
      }

      // State machine
      switch (guard.state) {
          case 'patrol':
              const target = guard.patrolPoints[guard.currentPatrolIndex];
              const speedMultiplier = AlertSystem.getInstance().getGuardSpeedMultiplier();
              moveGuardWithPathfinding(guard, target, guard.speed * speedMultiplier);
              if (dist(guard.position, target) < 15) {
                  guard.currentPatrolIndex = (guard.currentPatrolIndex + 1) % guard.patrolPoints.length;
              }
              guard.alertLevel = Math.max(0, guard.alertLevel - 0.5);
              break;

          case 'alert':
              if (guard.lastSeenPlayerPos) {
                  moveGuardWithPathfinding(guard, guard.lastSeenPlayerPos, guard.speed * 1.2);
                  if (dist(guard.position, guard.lastSeenPlayerPos) < 15) {
                      guard.state = 'searching';
                      guard.searchTimer = 5000;
                  }
              }
              break;

          case 'chase':
              if (bestTarget) {
                  moveGuardWithPathfinding(guard, bestTarget.position, guard.speed * 2);
                  guard.lastSeenPlayerPos = { ...bestTarget.position };
                  
                  // Contact damage
                  if (dist(guard.position, bestTarget.position) < 30) {
                      bestTarget.health -= 30;
                      // Knockback logic can be added here
                  }
              } else if (guard.lastSeenPlayerPos) {
                  moveGuardWithPathfinding(guard, guard.lastSeenPlayerPos, guard.speed * 2);
                  if (dist(guard.position, guard.lastSeenPlayerPos) < 15) {
                      guard.state = 'searching';
                      guard.searchTimer = 5000;
                  }
              }
              break;

          case 'searching':
              guard.searchTimer -= deltaTime;
              guard.visionAngle += 0.05; // Look around
              if (guard.searchTimer <= 0) {
                  guard.state = 'patrol';
                  guard.alertLevel = 0;
              }
              break;
      }
    });
  }, []);

  return { updateAI, guardPathsRef };
}

function dist(p1: Vec2, p2: Vec2) {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

function moveTowards(guard: Guard, target: Vec2, speed: number) {
    const angle = Math.atan2(target.y - guard.position.y, target.x - guard.position.x);
    guard.position.x += Math.cos(angle) * speed;
    guard.position.y += Math.sin(angle) * speed;
    guard.visionAngle = angle;
}
