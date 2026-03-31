import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { missions } from "@/data/mockData";
import MissionCard from "@/components/MissionCard";
import GameHeader from "@/components/GameHeader";
import { useTranslation } from "react-i18next";

export default function MissionsPage() {
  const { t } = useTranslation() as any;
  const chapters = [...new Set(missions.map((m) => m.chapter))].sort();

  return (
    <div className="min-h-screen bg-background cyber-grid">
      <div className="scanline fixed inset-0 z-50 pointer-events-none" />
      <GameHeader />
      <main className="mx-auto max-w-4xl px-4 py-12">
        <motion.h1
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-6 font-orbitron text-2xl font-bold text-primary text-glow-green"
        >
          {t("missions.catalog")}
        </motion.h1>

        {chapters.map((chapter) => (
          <motion.section
            key={chapter}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: chapter * 0.1 }}
            className="mb-8"
          >
            <h2 className="mb-3 font-orbitron text-sm font-bold uppercase tracking-widest text-secondary">
              {t("missions.chapter", { chapter })}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {missions
                .filter((m) => m.chapter === chapter)
                .map((mission) => (
                  <Link
                    key={mission.id}
                    to={mission.status !== "locked" ? `/mission/${mission.id}` : "#"}
                  >
                    <MissionCard mission={mission} />
                  </Link>
                ))}
            </div>
          </motion.section>
        ))}
      </main>
    </div>
  );
}
