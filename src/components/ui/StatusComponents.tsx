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

import { getLevelFromXP, getXPToNextLevel } from "@/lib/progression";
import { getRankByXP, getNextRank as getNextRankLib } from "@/lib/ranks";

/** XP rank ladder — delegated to centralized lib */
export function getRank(xp: number) {
  const rank = getRankByXP(xp);
  return {
    label: rank.name.en,
    color: rank.color,
    minXp: rank.minXP
  };
}

export function getNextRank(xp: number) {
  const next = getNextRankLib(xp);
  if (!next) return null;
  return {
    label: next.name.en,
    color: next.color,
    minXp: next.minXP
  };
}

/** Level derived from XP (progressive) */
export function getLevel(xp: number) {
  return getLevelFromXP(xp);
}

/** Progress % to next level (0-100) */
export function getLevelProgress(xp: number) {
  const { progress } = getXPToNextLevel(xp);
  return progress * 100;
}

