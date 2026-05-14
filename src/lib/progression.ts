/**
 * Формула: XP для уровня N = 100 * N * (N + 1) / 2
 *
 * Уровень  XP_total   XP_to_next
 * 1        0          100
 * 2        100        200
 * 3        300        300
 * 4        600        400
 * 5        1000       500
 * 10       4500       1000
 * 20       19000      2000
 * 50       127500     5000
 * 100      505000     10000
 */
const MAX_LEVEL = 100;

export function getLevelFromXP(xp: number): number {
  if (xp < 0) return 1;

  // Решаем уравнение: xp >= 100 * n * (n+1) / 2
  // n^2 + n - xp/50 >= 0
  // n = (-1 + sqrt(1 + xp*4/50)) / 2

  const level = Math.floor((-1 + Math.sqrt(1 + (xp * 4) / 50)) / 2) + 1;
  return Math.max(1, Math.min(MAX_LEVEL, level));
}

export function getXPForLevel(level: number): number {
  if (level <= 1) return 0;
  return (100 * (level - 1) * level) / 2;
}

export function getXPToNextLevel(xp: number): {
  current: number;
  required: number;
  progress: number; // 0..1
  level: number;
  nextLevel: number;
} {
  const level = getLevelFromXP(xp);
  const currentLevelXP = getXPForLevel(level);
  const nextLevelXP = getXPForLevel(level + 1);
  const xpInLevel = xp - currentLevelXP;
  const xpRequired = nextLevelXP - currentLevelXP;

  return {
    current: xpInLevel,
    required: xpRequired,
    progress: level >= MAX_LEVEL ? 1 : xpInLevel / xpRequired,
    level,
    nextLevel: Math.min(level + 1, MAX_LEVEL),
  };
}
