import { motion } from "framer-motion";
import { currentPlayer, missions, achievements } from "@/data/mockData";
import { Progress } from "@/components/ui/progress";
import GameHeader from "@/components/GameHeader";
import { Shield, Target, Flame, Calendar, Award } from "lucide-react";

const Profile = () => {
  const completedMissions = missions.filter((m) => m.status === "completed").length;
  const unlockedAchievements = achievements.filter((a) => a.unlocked).length;

  return (
    <div className="min-h-screen bg-background cyber-grid">
      <div className="scanline fixed inset-0 z-50 pointer-events-none" />
      <GameHeader />
      <main className="mx-auto max-w-2xl px-4 py-8">
        {/* Avatar + Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex flex-col items-center"
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-primary bg-primary/10 text-4xl box-glow-green animate-float">
            {currentPlayer.avatar}
          </div>
          <h1 className="mt-3 font-orbitron text-xl font-bold text-primary text-glow-green">
            {currentPlayer.username}
          </h1>
          <p className="font-mono text-xs text-secondary">{currentPlayer.rank}</p>
        </motion.div>

        {/* XP */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-6 rounded-lg border border-border bg-card/50 p-4"
        >
          <div className="mb-1 flex justify-between font-mono text-xs text-muted-foreground">
            <span>Уровень {currentPlayer.level}</span>
            <span>{currentPlayer.xp} / {currentPlayer.xpToNext} XP</span>
          </div>
          <Progress value={(currentPlayer.xp / currentPlayer.xpToNext) * 100} className="h-2" />
          <p className="mt-1 font-mono text-[10px] text-muted-foreground">
            {currentPlayer.xpToNext - currentPlayer.xp} XP до уровня {currentPlayer.level + 1}
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
          {[
            { icon: Shield, label: "Уровень", value: currentPlayer.level, color: "text-primary" },
            { icon: Target, label: "Миссии", value: `${completedMissions}/${missions.length}`, color: "text-secondary" },
            { icon: Flame, label: "Серия", value: `${currentPlayer.streak} дн.`, color: "text-neon-pink" },
            { icon: Award, label: "Награды", value: `${unlockedAchievements}/${achievements.length}`, color: "text-neon-yellow" },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="flex flex-col items-center rounded-lg border border-border bg-card/50 p-3">
                <Icon className={`mb-1 h-4 w-4 ${s.color}`} />
                <span className="font-mono text-[10px] text-muted-foreground">{s.label}</span>
                <span className={`font-orbitron text-sm font-bold ${s.color}`}>{s.value}</span>
              </div>
            );
          })}
        </motion.div>

        {/* Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="rounded-lg border border-border bg-card/50 p-4"
        >
          <h2 className="mb-3 font-orbitron text-sm font-bold text-accent">ИНФОРМАЦИЯ</h2>
          <div className="space-y-2 font-mono text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="h-3 w-3" />
              <span>Зарегистрирован: {currentPlayer.joinedDate}</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-3 w-3" />
              <span>ID: {currentPlayer.id}</span>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default Profile;
