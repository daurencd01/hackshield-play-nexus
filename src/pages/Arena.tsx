import { useState } from "react";
import { motion } from "framer-motion";
import { leaderboard, friends } from "@/data/mockData";
import LeaderboardTable from "@/components/LeaderboardTable";
import GameHeader from "@/components/GameHeader";

const Arena = () => {
  const [tab, setTab] = useState<"global" | "friends">("global");

  return (
    <div className="min-h-screen bg-background cyber-grid">
      <div className="scanline fixed inset-0 z-50 pointer-events-none" />
      <GameHeader />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <motion.h1
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-6 font-orbitron text-2xl font-bold text-accent text-glow-blue"
        >
          ▸ АРЕНА
        </motion.h1>

        <div className="mb-4 flex gap-2">
          {(["global", "friends"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-md px-4 py-1.5 font-orbitron text-xs uppercase tracking-wider transition-all ${
                tab === t
                  ? "bg-accent/10 text-accent border border-accent/40 box-glow-blue"
                  : "text-muted-foreground border border-transparent hover:text-foreground"
              }`}
            >
              {t === "global" ? "🌐 Рейтинг" : "👥 Друзья"}
            </button>
          ))}
        </div>

        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <LeaderboardTable entries={tab === "global" ? leaderboard : friends} />
        </motion.div>

        {/* Challenge CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6 rounded-lg border border-border bg-card/50 p-4 text-center"
        >
          <p className="font-orbitron text-sm font-bold text-secondary">⚔️ ВЫЗОВ</p>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            Вызови друга на дуэль — кто быстрее пройдёт миссию?
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="mt-3 rounded-md border border-neon-pink bg-neon-pink/10 px-6 py-2 font-orbitron text-xs font-bold uppercase text-neon-pink transition-all hover:bg-neon-pink/20"
          >
            Бросить вызов
          </motion.button>
        </motion.div>
      </main>
    </div>
  );
};

export default Arena;
