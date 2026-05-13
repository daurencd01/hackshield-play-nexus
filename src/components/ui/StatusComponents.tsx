import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted/50", className)}
      {...props}
    />
  );
}

/** Emits a full-page centered spinner */
export function PageLoader({ label = "Загрузка..." }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      <p className="font-mono text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

/** Emits a centered error block with optional retry */
export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="mx-auto max-w-md rounded-lg border border-destructive/40 bg-destructive/5 p-8 text-center">
      <p className="font-orbitron text-sm font-bold text-destructive">⚠ ОШИБКА</p>
      <p className="mt-2 font-mono text-xs text-muted-foreground">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 rounded border border-destructive/50 px-4 py-1.5 font-mono text-xs text-destructive hover:bg-destructive/10 transition-colors"
        >
          Повторить
        </button>
      )}
    </div>
  );
}

/** Centered empty state */
export function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mx-auto max-w-md rounded-lg border border-border bg-card/30 p-10 text-center">
      {icon && <div className="mb-3 text-4xl">{icon}</div>}
      <p className="font-orbitron text-sm font-bold text-muted-foreground">{title}</p>
      {subtitle && (
        <p className="mt-1 font-mono text-xs text-muted-foreground/60">{subtitle}</p>
      )}
    </div>
  );
}

/** XP rank ladder — single source of truth for rank thresholds */
export const RANKS = [
  { label: "Newbie",   minXp: 0,    color: "text-muted-foreground" },
  { label: "Analyst",  minXp: 500,  color: "text-accent" },
  { label: "Hunter",   minXp: 1500, color: "text-secondary" },
  { label: "Elite",    minXp: 3000, color: "text-neon-yellow" },
  { label: "Legend",   minXp: 6000, color: "text-neon-pink" },
] as const;

// Memoization caches
const getRankCache = new Map<number, typeof RANKS[number]>();
const getNextRankCache = new Map<number, typeof RANKS[number] | null>();
const getLevelCache = new Map<number, number>();
const getLevelProgressCache = new Map<number, number>();

export function getRank(xp: number) {
  if (getRankCache.has(xp)) return getRankCache.get(xp)!;
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (xp >= RANKS[i].minXp) {
      getRankCache.set(xp, RANKS[i]);
      return RANKS[i];
    }
  }
  return RANKS[0];
}

export function getNextRank(xp: number) {
  if (getNextRankCache.has(xp)) return getNextRankCache.get(xp) ?? null;
  for (const rank of RANKS) {
    if (xp < rank.minXp) {
      getNextRankCache.set(xp, rank);
      return rank;
    }
  }
  getNextRankCache.set(xp, null);
  return null; // max rank
}

/** Level derived from XP (every 1000 XP = 1 level) */
export function getLevel(xp: number) {
  if (getLevelCache.has(xp)) return getLevelCache.get(xp)!;
  const level = Math.floor(xp / 1000) + 1;
  getLevelCache.set(xp, level);
  return level;
}

/** Progress % to next level (0-100) */
export function getLevelProgress(xp: number) {
  if (getLevelProgressCache.has(xp)) return getLevelProgressCache.get(xp)!;
  const progress = (xp % 1000) / 10;
  getLevelProgressCache.set(xp, progress);
  return progress;
}
