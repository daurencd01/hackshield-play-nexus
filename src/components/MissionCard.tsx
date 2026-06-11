import { Mission, ScenarioStep, Scenario } from "@/types/scenario";
import { Lock, CheckCircle, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

const difficultyColors: Record<string, string> = {
  easy: "text-primary border-primary/40",
  medium: "text-neon-yellow border-neon-yellow/40",
  hard: "text-neon-pink border-neon-pink/40",
  legendary: "text-neon-purple border-neon-purple/40",
};

interface MissionCardProps {
  mission: Mission;
  onClick?: () => void;
}

export default function MissionCard({ mission, onClick }: MissionCardProps) {
  const { t } = useTranslation() as any;
  const isLocked = mission.status === "locked";
  const isCompleted = mission.status === "completed";

  return (
    <motion.div
      whileHover={!isLocked ? { scale: 1.02, y: -2 } : {}}
      whileTap={!isLocked ? { scale: 0.98 } : {}}
      onClick={!isLocked ? onClick : undefined}
      className={`group relative cursor-pointer overflow-hidden rounded-lg border p-4 transition-all ${
        isLocked
          ? "cursor-not-allowed border-border bg-muted/30 opacity-50"
          : isCompleted
          ? "border-primary/30 bg-primary/5 box-glow-green"
          : "border-secondary/40 bg-card hover:border-secondary hover:box-glow-purple"
      }`}
    >
      {/* Chapter badge */}
      <div className="absolute right-3 top-3 font-mono text-xs text-muted-foreground">
        {t("mission_card.ch", { chapter: mission.chapter })}
      </div>

      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-muted/50 text-2xl">
          {isLocked ? <Lock className="h-5 w-5 text-muted-foreground" /> : mission.icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-orbitron text-sm font-bold">{mission.title}</h3>
            {isCompleted && <CheckCircle className="h-4 w-4 text-primary" />}
          </div>
          <p className="mt-1 font-mono text-xs text-muted-foreground line-clamp-2">
            {mission.description}
          </p>
          <div className="mt-2 flex items-center gap-3">
            <span className={`rounded border px-2 py-0.5 font-mono text-[10px] uppercase ${difficultyColors[mission.difficulty]}`}>
              {t(`mission_card.difficulty.${mission.difficulty}` as any)}
            </span>
            <span className="font-mono text-xs text-neon-yellow">+{mission.xpReward} XP</span>
          </div>
        </div>
        {!isLocked && (
          <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
        )}
      </div>
    </motion.div>
  );
}
