import { Shield } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { 
  getRank, getLevel, getLevelProgress, getNextRank 
} from "@/components/ui/StatusComponents";
import { getXPToNextLevel, getXPForLevel } from "@/lib/progression";
import { RANKS } from "@/lib/ranks";

interface XpCardProps {
  xp: number;
}

export function XpCard({ xp }: XpCardProps) {
  const level = getLevel(xp);
  const progress = getLevelProgress(xp);
  const rank = getRank(xp);
  const nextRank = getNextRank(xp);

  const { current: xpInLevel, required: xpRequired } = getXPToNextLevel(xp);


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
          <span>{xpInLevel.toLocaleString()} / {xpRequired.toLocaleString()} XP</span>
          <span>{(xpRequired - xpInLevel).toLocaleString()} до уровня {level + 1}</span>
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
            key={r.id}
            title={r.name.ru}
            className={`flex-1 rounded-sm py-1 text-center font-mono text-[8px] uppercase transition-all border ${
              xp >= r.minXP
                ? "bg-primary/20 text-primary border-primary/30"
                : "bg-muted/10 text-muted-foreground/30 border-transparent"
            }`}
          >
            {r.icon}
          </div>
        ))}
      </div>
    </div>
  );
}

