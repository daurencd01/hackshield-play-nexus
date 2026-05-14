import { getLevelFromXP } from './progression';

export interface Rank {
  id: string;
  name: { ru: string; en: string; kk: string };
  minLevel: number;
  minXP: number;
  color: string; // tailwind text color
  glow: string; // shadow color
  icon: string; // emoji
}

export const RANKS: Rank[] = [
  {
    id: 'newbie',
    name: { ru: 'Новичок', en: 'Newbie', kk: 'Жаңадан' },
    minLevel: 1,
    minXP: 0,
    color: 'text-gray-400',
    glow: 'rgba(156,163,175,0.4)',
    icon: '👤',
  },
  {
    id: 'trainee',
    name: { ru: 'Стажёр', en: 'Trainee', kk: 'Тағылымдамашы' },
    minLevel: 3,
    minXP: 300,
    color: 'text-blue-400',
    glow: 'rgba(96,165,250,0.4)',
    icon: '🎓',
  },
  {
    id: 'analyst',
    name: { ru: 'Аналитик', en: 'Analyst', kk: 'Талдаушы' },
    minLevel: 7,
    minXP: 2100,
    color: 'text-cyan-400',
    glow: 'rgba(34,211,238,0.4)',
    icon: '🔍',
  },
  {
    id: 'agent',
    name: { ru: 'Агент', en: 'Agent', kk: 'Агент' },
    minLevel: 12,
    minXP: 6600,
    color: 'text-green-400',
    glow: 'rgba(74,222,128,0.5)',
    icon: '🛡️',
  },
  {
    id: 'specialist',
    name: { ru: 'Специалист', en: 'Specialist', kk: 'Маман' },
    minLevel: 18,
    minXP: 15300,
    color: 'text-emerald-400',
    glow: 'rgba(52,211,153,0.5)',
    icon: '⚙️',
  },
  {
    id: 'expert',
    name: { ru: 'Эксперт', en: 'Expert', kk: 'Сарапшы' },
    minLevel: 25,
    minXP: 30000,
    color: 'text-yellow-400',
    glow: 'rgba(250,204,21,0.5)',
    icon: '💎',
  },
  {
    id: 'elite',
    name: { ru: 'Элита', en: 'Elite', kk: 'Элита' },
    minLevel: 35,
    minXP: 60000,
    color: 'text-orange-400',
    glow: 'rgba(251,146,60,0.6)',
    icon: '🔥',
  },
  {
    id: 'master',
    name: { ru: 'Мастер', en: 'Master', kk: 'Шебер' },
    minLevel: 50,
    minXP: 127500,
    color: 'text-red-400',
    glow: 'rgba(248,113,113,0.6)',
    icon: '⚔️',
  },
  {
    id: 'legend',
    name: { ru: 'Легенда', en: 'Legend', kk: 'Аңыз' },
    minLevel: 75,
    minXP: 285000,
    color: 'text-pink-400',
    glow: 'rgba(244,114,182,0.7)',
    icon: '👑',
  },
  {
    id: 'commander',
    name: { ru: 'Кибер-Командор', en: 'Cyber Commander', kk: 'Кибер-Командир' },
    minLevel: 100,
    minXP: 505000,
    color: 'text-fuchsia-400',
    glow: 'rgba(232,121,249,0.8)',
    icon: '⚡',
  },
];

export function getRankByXP(xp: number): Rank {
  const level = getLevelFromXP(xp);

  // Идём с конца — ищем максимальный подходящий ранг
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (level >= RANKS[i].minLevel) return RANKS[i];
  }

  return RANKS[0];
}

export function getNextRank(xp: number): Rank | null {
  const current = getRankByXP(xp);
  const idx = RANKS.findIndex((r) => r.id === current.id);
  return idx < RANKS.length - 1 ? RANKS[idx + 1] : null;
}

export function getRankProgress(xp: number): {
  current: Rank;
  next: Rank | null;
  progress: number;
  xpToNext: number;
} {
  const current = getRankByXP(xp);
  const next = getNextRank(xp);

  if (!next) {
    return { current, next: null, progress: 1, xpToNext: 0 };
  }

  const xpInRank = xp - current.minXP;
  const xpRange = next.minXP - current.minXP;

  return {
    current,
    next,
    progress: Math.min(1, xpInRank / xpRange),
    xpToNext: next.minXP - xp,
  };
}
