import { LeaderboardEntry } from "@/data/mockData";

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  highlightUser?: string;
}

const LeaderboardTable = ({ entries, highlightUser = "ShadowByte" }: LeaderboardTableProps) => {
  const getRankStyle = (rank: number) => {
    if (rank === 1) return "text-neon-yellow text-glow-green font-bold";
    if (rank === 2) return "text-muted-foreground font-bold";
    if (rank === 3) return "text-neon-pink font-bold";
    return "text-muted-foreground";
  };

  return (
    <div className="space-y-1">
      {entries.map((entry) => {
        const isHighlighted = entry.username === highlightUser;
        return (
          <div
            key={entry.rank}
            className={`flex items-center gap-3 rounded-md border px-3 py-2 transition-all ${
              isHighlighted
                ? "border-primary/40 bg-primary/5 box-glow-green"
                : "border-transparent bg-muted/20 hover:bg-muted/40"
            }`}
          >
            <span className={`w-6 text-center font-orbitron text-sm ${getRankStyle(entry.rank)}`}>
              {entry.rank <= 3 ? ["🥇", "🥈", "🥉"][entry.rank - 1] : `#${entry.rank}`}
            </span>
            <div className="relative flex h-8 w-8 items-center justify-center rounded-full border border-border bg-muted/50 text-base">
              {entry.avatar}
              {entry.isOnline && (
                <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary" />
              )}
            </div>
            <div className="flex-1">
              <p className={`font-mono text-sm ${isHighlighted ? "text-primary" : ""}`}>
                {entry.username}
              </p>
              <p className="font-mono text-[10px] text-muted-foreground">
                LVL {entry.level} · {entry.missionsCompleted} missions
              </p>
            </div>
            <span className="font-orbitron text-xs font-bold text-neon-yellow">{entry.xp.toLocaleString()} XP</span>
          </div>
        );
      })}
    </div>
  );
};

export default LeaderboardTable;
