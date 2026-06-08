import { useCallback } from 'react';
import { GameState, Vec2, Player } from '@/types/game';

export function useGameCollision() {
  const resolveMovement = useCallback((player: Player, desiredPos: Vec2, walls: any[], doors: any[], cellSize: number = 50) => {
    // 1. Wall Collision (AABB)
    let finalX = desiredPos.x;
    let finalY = desiredPos.y;
    
    const playerSize = 12; // Radius
    
    // Check X
    const rectX = { x: finalX - playerSize, y: player.position.y - playerSize, w: playerSize * 2, h: playerSize * 2 };
    if (isCollidingWithObstacles(rectX, walls, doors)) {
        finalX = player.position.x;
    }

    // Check Y
    const rectY = { x: finalX - playerSize, y: finalY - playerSize, w: playerSize * 2, h: playerSize * 2 };
    if (isCollidingWithObstacles(rectY, walls, doors)) {
        finalY = player.position.y;
    }

    player.position.x = finalX;
    player.position.y = finalY;
  }, []);

  const checkInteraction = useCallback((gs: GameState, player: Player) => {
      // Check Terminal interactions
      for (const t of gs.terminals) {
          if (!t.isHacked && dist(player.position, t.position) < 40) {
              return { type: 'terminal', target: t };
          }
      }
      
      // Check Collectibles
      for (let i = gs.collectibles.length - 1; i >= 0; i--) {
          const c = gs.collectibles[i];
          if (dist(player.position, c.position) < 30) {
              return { type: 'collectible', index: i, target: c };
          }
      }

      // Check Exit
      const exitPoint = { x: gs.currentRoomId * 0 + 650, y: 250 }; // Simplified for now, should come from RoomConfig
      if (dist(player.position, exitPoint) < 50) {
          const allMainHacked = gs.terminals.filter(t => t.isMainObjective).every(t => t.isHacked);
          if (allMainHacked) return { type: 'exit' };
      }

      return null;
  }, []);

  return { resolveMovement, checkInteraction };
}

function isCollidingWithObstacles(rect: any, walls: any[], doors: any[]) {
    for (const w of walls) {
        if (rectIntersect(rect, w)) return true;
    }
    for (const d of doors) {
        if (d.state === 'closed' || d.state === 'locked') {
            if (rectIntersect(rect, { x: d.position.x, y: d.position.y, w: d.width, h: d.height })) return true;
        }
    }
    return false;
}

function rectIntersect(r1: any, r2: any) {
    return r1.x < r2.x + r2.w && r1.x + r1.w > r2.x && r1.y < r2.y + r2.h && r1.y + r1.h > r2.y;
}

function dist(p1: Vec2, p2: Vec2) {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}
