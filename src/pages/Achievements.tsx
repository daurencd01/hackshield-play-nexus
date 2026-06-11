import { motion } from "framer-motion";
import { achievements } from "@/data/defaultData";
import { Progress } from "@/components/ui/progress";
import GameHeader from "@/components/GameHeader";

const rarityStyles: Record<string, { border: string; bg: string; label: string; text: string }> = {
  common: { border: "border-muted-foreground/30", bg: "bg-muted/20", label: "ОБЫЧНАЯ", text: "text-muted-foreground" },
  rare: { border: "border-accent/40", bg: "bg-accent/5", label: "РЕДКАЯ", text: "text-accent" },
  epic: { border: "border-neon-purple/40", bg: "bg-neon-purple/5", label: "ЭПИЧЕСКАЯ", text: "text-neon-purple" },
  legendary: { border: "border-neon-yellow/40", bg: "bg-neon-yellow/5", label: "ЛЕГЕНДАРНАЯ", text: "text-neon-yellow" },
};

export default function AchievementsPage() {
  const unlocked = achievements.filter((a) => a.unlocked).length;

  return (
    <div className="min-h-screen bg-background cyber-grid">
      <div className="scanline fixed inset-0 z-50 pointer-events-none" />
      <GameHeader />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-6 flex items-center justify-between"
        >
          <h1 className="font-orbitron text-2xl font-bold text-neon-yellow">▸ ДОСТИЖЕНИЯ</h1>
          <span className="font-mono text-sm text-muted-foreground">{unlocked}/{achievements.length}</span>
        </motion.div>

        <div className="grid gap-3 sm:grid-cols-2">
          {achievements.map((a, i) => {
            const style = rarityStyles[a.rarity];
            return (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`rounded-lg border p-4 transition-all ${style.border} ${style.bg} ${
                  !a.unlocked ? "opacity-50" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{a.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-orbitron text-sm font-bold">{a.title}</h3>
                      <span className={`font-mono text-[9px] uppercase ${style.text}`}>{style.label}</span>
                    </div>
                    <p className="mt-0.5 font-mono text-xs text-muted-foreground">{a.description}</p>
                    {a.maxProgress && (
                      <div className="mt-2">
                        <div className="mb-0.5 flex justify-between font-mono text-[10px] text-muted-foreground">
                          <span>Прогресс</span>
                          <span>{a.progress}/{a.maxProgress}</span>
                        </div>
                        <Progress value={((a.progress || 0) / a.maxProgress) * 100} className="h-1" />
                      </div>
                    )}
                    {a.unlockedDate && (
                      <p className="mt-1 font-mono text-[10px] text-primary">✓ {a.unlockedDate}</p>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
