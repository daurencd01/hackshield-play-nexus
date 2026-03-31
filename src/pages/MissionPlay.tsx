import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { missions, missionScenario } from "@/data/mockData";
import ScenarioPlayer from "@/components/ScenarioPlayer";
import GameHeader from "@/components/GameHeader";
import { ArrowLeft, Award } from "lucide-react";
import { Button } from "@/components/ui/button";

const MissionPlay = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [started, setStarted] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [earnedXP, setEarnedXP] = useState(0);

  const mission = missions.find((m) => m.id === id) || missions[2]; // default to ransomware

  const handleComplete = (xp: number) => {
    setEarnedXP(xp);
    setCompleted(true);
  };

  return (
    <div className="min-h-screen bg-background cyber-grid">
      <div className="scanline fixed inset-0 z-50 pointer-events-none" />
      <GameHeader />
      <main className="mx-auto max-w-4xl px-4 py-8">
        {!started && !completed && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto max-w-lg text-center"
          >
            <button onClick={() => navigate(-1)} className="mb-6 flex items-center gap-1 font-mono text-xs text-muted-foreground hover:text-primary transition-colors">
              <ArrowLeft className="h-3 w-3" /> Назад
            </button>
            <div className="mb-4 text-5xl">{mission.icon}</div>
            <h1 className="font-orbitron text-2xl font-bold text-primary text-glow-green">
              {mission.title}
            </h1>
            <p className="mt-2 font-mono text-xs text-muted-foreground uppercase">
              Глава {mission.chapter} · +{mission.xpReward} XP
            </p>
            <div className="mt-6 rounded-lg border border-border bg-card/50 p-4 text-left">
              <p className="font-orbitron text-xs font-bold text-secondary uppercase tracking-wider mb-2">Брифинг</p>
              <p className="font-mono text-sm text-muted-foreground">{mission.briefing}</p>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">{mission.description}</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setStarted(true)}
              className="mt-6 rounded-lg border border-secondary bg-secondary/10 px-8 py-3 font-orbitron text-sm font-bold uppercase tracking-widest text-secondary transition-all hover:bg-secondary/20 box-glow-purple"
            >
              🎯 НАЧАТЬ МИССИЮ
            </motion.button>
          </motion.div>
        )}

        {started && !completed && (
          <ScenarioPlayer steps={missionScenario} onComplete={handleComplete} />
        )}

        {completed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mx-auto max-w-md text-center"
          >
            <Award className="mx-auto h-16 w-16 text-neon-yellow" />
            <h1 className="mt-4 font-orbitron text-2xl font-bold text-primary text-glow-green">
              МИССИЯ ЗАВЕРШЕНА
            </h1>
            <p className="mt-2 font-mono text-lg text-neon-yellow">+{earnedXP} XP</p>
            <p className="mt-1 font-mono text-sm text-muted-foreground">{mission.title}</p>
            <div className="mt-6 flex justify-center gap-3">
              <Button variant="outline" onClick={() => navigate("/missions")} className="font-orbitron text-xs uppercase">
                Все миссии
              </Button>
              <Button
                onClick={() => { setStarted(false); setCompleted(false); setEarnedXP(0); }}
                className="font-orbitron text-xs uppercase bg-secondary text-secondary-foreground hover:bg-secondary/80"
              >
                Переиграть
              </Button>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default MissionPlay;
