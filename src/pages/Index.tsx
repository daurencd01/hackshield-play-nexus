import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { currentPlayer, missions } from "@/data/mockData";
import { Progress } from "@/components/ui/progress";
import MissionCard from "@/components/MissionCard";
import GameHeader from "@/components/GameHeader";
import { Shield, Zap, Target, Flame } from "lucide-react";

const Index = () => {
  const [hoveredStat, setHoveredStat] = useState<string | null>(null);
  const availableMissions = missions.filter((m) => m.status === "available");
  const completedCount = missions.filter((m) => m.status === "completed").length;

  const stats = [
    { label: "УРОВЕНЬ", value: currentPlayer.level, icon: Shield, color: "text-primary" },
    { label: "МИССИИ", value: `${completedCount}/${missions.length}`, icon: Target, color: "text-secondary" },
    { label: "СЕРИЯ", value: `${currentPlayer.streak}🔥`, icon: Flame, color: "text-neon-pink" },
    { label: "РАНГ", value: currentPlayer.rank, icon: Zap, color: "text-neon-yellow" },
  ];

  return (
    <div className="min-h-screen bg-background cyber-grid">
      <div className="scanline fixed inset-0 z-50 pointer-events-none" />
      <GameHeader />
      <main className="mx-auto max-w-5xl px-4 py-8">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <h1 className="font-orbitron text-3xl font-black text-primary text-glow-green sm:text-5xl">
            HACK<span className="text-secondary text-glow-purple">SHIELD</span>
          </h1>
          <p className="mt-2 font-mono text-sm text-muted-foreground">
            [ CYBERSECURITY TRAINING PLATFORM ]
          </p>

          {/* XP Bar */}
          <div className="mx-auto mt-6 max-w-md">
            <div className="mb-1 flex justify-between font-mono text-xs text-muted-foreground">
              <span>Агент: <span className="text-primary">{currentPlayer.username}</span></span>
              <span>{currentPlayer.xp} / {currentPlayer.xpToNext} XP</span>
            </div>
            <Progress value={(currentPlayer.xp / currentPlayer.xpToNext) * 100} className="h-2" />
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                onMouseEnter={() => setHoveredStat(stat.label)}
                onMouseLeave={() => setHoveredStat(null)}
                className={`flex flex-col items-center rounded-lg border border-border bg-card/50 p-3 transition-all ${
                  hoveredStat === stat.label ? "border-primary/50 box-glow-green" : ""
                }`}
              >
                <Icon className={`mb-1 h-5 w-5 ${stat.color}`} />
                <span className="font-mono text-[10px] text-muted-foreground">{stat.label}</span>
                <span className={`font-orbitron text-sm font-bold ${stat.color}`}>{stat.value}</span>
              </div>
            );
          })}
        </motion.div>

        {/* Available missions */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-orbitron text-lg font-bold text-secondary text-glow-purple">
              ▸ ДОСТУПНЫЕ МИССИИ
            </h2>
            <Link to="/missions" className="font-mono text-xs text-muted-foreground hover:text-primary transition-colors">
              Все миссии →
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {availableMissions.map((mission) => (
              <Link key={mission.id} to={`/mission/${mission.id}`}>
                <MissionCard mission={mission} />
              </Link>
            ))}
          </div>
        </motion.section>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center"
        >
          <Link to="/missions">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="rounded-lg border border-primary bg-primary/10 px-8 py-3 font-orbitron text-sm font-bold uppercase tracking-widest text-primary transition-all hover:bg-primary/20 box-glow-green"
            >
              ⚡ START MISSION
            </motion.button>
          </Link>
        </motion.div>
      </main>
    </div>
  );
};

export default Index;
