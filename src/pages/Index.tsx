import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { currentPlayer, missions } from "@/data/mockData";
import { Progress } from "@/components/ui/progress";
import MissionCard from "@/components/MissionCard";
import GameHeader from "@/components/GameHeader";
import { Shield, Zap, Target, Flame } from "lucide-react";

export default function HomePage() {
  const [hoveredStat, setHoveredStat] = useState<string | null>(null);
  const activeMissions = missions.filter((m) => m.status === "available");
  const completedMissionsCount = missions.filter((m) => m.status === "completed").length;

  const stats = [
    { label: "УРОВЕНЬ", value: currentPlayer.level, icon: Shield, color: "text-primary" },
    { label: "ПРОГРЕСС", value: `${completedMissionsCount}/${missions.length}`, icon: Target, color: "text-secondary" },
    { label: "СЕРИЯ", value: `${currentPlayer.streak}🔥`, icon: Flame, color: "text-neon-pink" },
    { label: "РЕЙТИНГ", value: currentPlayer.rank, icon: Zap, color: "text-neon-yellow" },
  ];

  return (
    <div className="min-h-screen bg-background cyber-grid">
      <div className="scanline fixed inset-0 z-50 pointer-events-none" />
      <GameHeader />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 text-center"
        >
          <h1 className="font-orbitron text-4xl font-black text-primary text-glow-green md:text-6xl tracking-wider">
            HACK<span className="text-secondary text-glow-purple">SHIELD</span>
          </h1>
          <p className="mt-3 font-mono text-sm text-muted-foreground tracking-widest opacity-80">
            [ CYBERSECURITY TRAINING PLATFORM ]
          </p>

          <div className="mx-auto mt-8 max-w-md bg-black/20 p-4 rounded-xl border border-primary/20 backdrop-blur-sm">
            <div className="mb-2 flex justify-between font-mono text-xs text-muted-foreground uppercase">
              <span>Оперативник: <strong className="text-primary">{currentPlayer.username}</strong></span>
              <span>{currentPlayer.xp} / {currentPlayer.xpToNext} XP</span>
            </div>
            <Progress value={(currentPlayer.xp / currentPlayer.xpToNext) * 100} className="h-2.5 bg-background shadow-inner" />
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-12 grid grid-cols-2 gap-4 md:grid-cols-4"
        >
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                onMouseEnter={() => setHoveredStat(stat.label)}
                onMouseLeave={() => setHoveredStat(null)}
                className={`relative overflow-hidden flex flex-col items-center rounded-xl border border-border bg-card/40 p-5 backdrop-blur-md transition-all duration-300 ${
                  hoveredStat === stat.label ? "border-primary/60 box-glow-green transform -translate-y-1" : "hover:border-primary/30"
                }`}
              >
                <div className={`absolute top-0 w-full h-1 opacity-20 ${hoveredStat === stat.label ? "bg-primary" : "bg-transparent"}`} />
                <Icon className={`mb-2 h-6 w-6 ${stat.color} transition-transform duration-300 ${hoveredStat === stat.label ? "scale-110" : ""}`} />
                <span className="font-mono text-[11px] text-muted-foreground tracking-wider mb-1">{stat.label}</span>
                <span className={`font-orbitron text-lg font-bold ${stat.color}`}>{stat.value}</span>
              </div>
            );
          })}
        </motion.div>
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="mb-6 flex items-end justify-between border-b border-border/50 pb-2">
            <h2 className="font-orbitron text-xl font-bold text-secondary text-glow-purple flex items-center gap-2">
              <span className="inline-block w-2 h-2 bg-secondary rounded-full animate-pulse" />
              АКТИВНЫЕ ЗАДАНИЯ
            </h2>
            <Link to="/missions" className="font-mono text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 group">
              База данных <span className="group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {activeMissions.map((mission) => (
              <Link key={mission.id} to={`/mission/${mission.id}`} className="block group">
                <div className="transition-transform duration-300 group-hover:-translate-y-1">
                  <MissionCard mission={mission} />
                </div>
              </Link>
            ))}
          </div>
        </motion.section>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 text-center"
        >
          <Link to="/missions">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative overflow-hidden rounded-lg border border-primary bg-primary/10 px-10 py-4 font-orbitron text-sm font-bold uppercase tracking-widest text-primary transition-all hover:bg-primary/20 box-glow-green group"
            >
              <span className="absolute inset-0 bg-primary/20 translate-y-[100%] group-hover:translate-y-[0%] transition-transform duration-300 ease-in-out" />
              <span className="relative flex items-center gap-2">
                <Zap className="h-4 w-4" /> НАЧАТЬ ПОДГОТОВКУ
              </span>
            </motion.button>
          </Link>
        </motion.div>
      </main>
    </div>
  );
}
