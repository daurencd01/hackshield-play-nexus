import { Shield } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { 
  getRank, getNextRank, getLevel, getLevelProgress, RANKS 
} from "@/components/ui/StatusComponents";

interface XpCardProps {
  xp: number;
}

export function XpCard({ xp }: XpCardProps) {
  const level = getLevel(xp);
  const progress = getLevelProgress(xp);
  const rank = getRank(xp);
  const nextRank = getNextRank(xp);
  const xpInLevel = xp % 1000;

  return (
    <div className="rounded-lg border border-border bg-card/50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase text-muted-foreground">Уровень</p>
          <p className="font-orbitron text-3xl font-bold text-primary">{level}</p>
        </div>
        <div className="text-right">
          <p className="font-mono text-[10px] uppercase text-muted-foreground">Всего XP</p>
          <p className="font-orbitron text-xl font-bold text-neon-yellow">{xp.toLocaleString()}</p>
        </div>
      </div>

      <div>
        <div className="mb-1 flex justify-between font-mono text-[10px] text-muted-foreground">
          <span>{xpInLevel} / 1000 XP</span>
          <span>{(1000 - xpInLevel).toLocaleString()} до уровня {level + 1}</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <div className="flex items-center justify-between rounded-md border border-border bg-muted/20 px-3 py-2">
        <div className="flex items-center gap-2">
          <Shield className={`h-4 w-4 ${rank.color}`} />
          <span className={`font-orbitron text-xs font-bold ${rank.color}`}>{rank.label}</span>
        </div>
        {nextRank ? (
          <span className="font-mono text-[10px] text-muted-foreground">
            → {nextRank.label} @ {nextRank.minXp.toLocaleString()} XP
          </span>
        ) : (
          <span className="font-mono text-[10px] text-neon-pink">MAX RANK</span>
        )}
      </div>

      <div className="flex gap-1 pt-1">
        {RANKS.map((r) => (
          <div
            key={r.label}
            className={`flex-1 rounded-sm py-0.5 text-center font-mono text-[8px] uppercase transition-all ${
              xp >= r.minXp
                ? "bg-primary/20 text-primary"
                : "bg-muted/20 text-muted-foreground/40"
            }`}
          >
            {r.label[0]}
          </div>
        ))}
      </div>
    </div>
  );
}
