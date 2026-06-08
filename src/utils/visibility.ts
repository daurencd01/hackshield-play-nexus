import { Vec2 } from '@/types/game';

export function isPointInFOV(
  point: Vec2,
  origin: Vec2,
  direction: number, // radians
  fov: number,       // radians
  range: number
): boolean {
  const dx = point.x - origin.x;
  const dy = point.y - origin.y;
  const distSq = dx * dx + dy * dy;
  
  if (distSq > range * range) return false;
  
  const angleToPoint = Math.atan2(dy, dx);
  let diff = angleToPoint - direction;
  
  // Normalize angle diff to [-PI, PI]
  while (diff < -Math.PI) diff += Math.PI * 2;
  while (diff > Math.PI) diff -= Math.PI * 2;
  
  return Math.abs(diff) < fov / 2;
}

export function checkRaycast(
  start: Vec2,
  end: Vec2,
  walls: { x: number; y: number; w: number; h: number }[]
): boolean {
  // Simple ray-box intersection check
  for (const wall of walls) {
    if (lineIntersectsRect(start, end, wall)) {
      return false; // Obstructed
    }
  }
  return true; // Clear line of sight
}

function lineIntersectsRect(p1: Vec2, p2: Vec2, rect: { x: number, y: number, w: number, h: number }): boolean {
    const minX = rect.x;
    const maxX = rect.x + rect.w;
    const minY = rect.y;
    const maxY = rect.y + rect.h;

    // Completely outside
    if ((p1.x < minX && p2.x < minX) || (p1.x > maxX && p2.x > maxX) ||
        (p1.y < minY && p2.y < minY) || (p1.y > maxY && p2.y > maxY)) return false;

    // Horizontal/Vertical lines
    if (p1.x === p2.x) return p1.x >= minX && p1.x <= maxX;
    if (p1.y === p2.y) return p1.y >= minY && p1.y <= maxY;

    const m = (p2.y - p1.y) / (p2.x - p1.x);
    const c = p1.y - m * p1.x;

    // Check intersection with each edge of the rect
    const yAtMinX = m * minX + c;
    if (yAtMinX >= minY && yAtMinX <= maxY) return true;

    const yAtMaxX = m * maxX + c;
    if (yAtMaxX >= minY && yAtMaxX <= maxY) return true;

    const xAtMinY = (minY - c) / m;
    if (xAtMinY >= minX && xAtMinY <= maxX) return true;

    const xAtMaxY = (maxY - c) / m;
    if (xAtMaxY >= minX && xAtMaxY <= maxX) return true;

    return false;
}
