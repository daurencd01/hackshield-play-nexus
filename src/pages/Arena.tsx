import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Zap, Users, Globe, RefreshCw } from "lucide-react";
import GameHeader from "@/components/GameHeader";
import { useUser } from "@/hooks/useUser";
import {
  PageLoader, ErrorState, EmptyState, Skeleton,
  getRank, getLevel,
} from "@/components/ui/StatusComponents";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface LeaderboardUser {
  id: string;
  username: string | null;
  xp: number;
  avatar_url: string | null;
}

// ─── Medal / rank helpers ──────────────────────────────────────────────────────

function getMedal(position: number) {
  if (position === 1) return { emoji: "🥇", color: "text-neon-yellow" };
  if (position === 2) return { emoji: "🥈", color: "text-muted-foreground" };
  if (position === 3) return { emoji: "🥉", color: "text-neon-pink" };
  return { emoji: null, color: "text-muted-foreground" };
}

// ─── Skeleton placeholder rows ─────────────────────────────────────────────────

function LeaderboardSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-md border border-border/40 px-3 py-3">
          <Skeleton className="h-6 w-6 rounded" />
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-28 rounded" />
            <Skeleton className="h-2 w-16 rounded" />
          </div>
          <Skeleton className="h-4 w-16 rounded" />
        </div>
      ))}
    </div>
  );
}

// ─── Single entry row ──────────────────────────────────────────────────────────

interface EntryRowProps {
  position: number;
  entry: LeaderboardUser;
  isCurrentUser: boolean;
  delay: number;
}

function EntryRow({ position, entry, isCurrentUser, delay }: EntryRowProps) {
  const { emoji, color } = getMedal(position);
  const rank = getRank(entry.xp);
  const level = getLevel(entry.xp);
  const initials = (entry.username ?? "?")[0].toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className={`flex items-center gap-3 rounded-md border px-3 py-2.5 transition-all ${
        isCurrentUser
          ? "border-primary/50 bg-primary/5 box-glow-green"
          : "border-transparent bg-muted/20 hover:bg-muted/30"
      }`}
    >
      {/* Position */}
      <div className="flex w-7 items-center justify-center">
        {emoji ? (
          <span className="text-lg leading-none">{emoji}</span>
        ) : (
          <span className={`font-orbitron text-xs font-bold ${color}`}>#{position}</span>
        )}
      </div>

      {/* Avatar */}
      <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-border bg-muted/50 flex items-center justify-center">
        {entry.avatar_url ? (
          <img src={entry.avatar_url} alt={entry.username ?? "avatar"} className="h-full w-full object-cover" />
        ) : (
          <span className="font-orbitron text-sm font-bold text-primary">{initials}</span>
        )}
      </div>

      {/* Name + meta */}
      <div className="flex-1 min-w-0">
        <p className={`truncate font-mono text-sm font-bold ${isCurrentUser ? "text-primary" : ""}`}>
          {entry.username ?? "Аноним"}
          {isCurrentUser && <span className="ml-1.5 font-mono text-[10px] text-muted-foreground">(Вы)</span>}
        </p>
        <p className={`font-mono text-[10px] ${rank.color}`}>
          {rank.label} · LVL {level}
        </p>
      </div>

      {/* XP */}
      <span className="shrink-0 font-orbitron text-xs font-bold text-neon-yellow">
        {entry.xp.toLocaleString()} XP
      </span>
    </motion.div>
  );
}

// ─── Podium (top 3) ────────────────────────────────────────────────────────────

function Podium({ top3 }: { top3: LeaderboardUser[] }) {
  const order = [1, 0, 2]; // visual order: 2nd, 1st, 3rd
  const heights = [72, 96, 56];
  const colors = ["text-muted-foreground", "text-neon-yellow", "text-neon-pink"];

  return (
    <div className="mb-6 flex items-end justify-center gap-3">
      {order.map((idx, visualPos) => {
        const entry = top3[idx];
        if (!entry) return null;
        const pos = idx + 1;
        const initials = (entry.username ?? "?")[0].toUpperCase();

        return (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * visualPos }}
            className="flex flex-col items-center gap-1"
          >
            <div className="h-10 w-10 overflow-hidden rounded-full border-2 border-border bg-muted/50 flex items-center justify-center">
              {entry.avatar_url ? (
                <img src={entry.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="font-orbitron text-base font-bold text-primary">{initials}</span>
              )}
            </div>
            <p className="max-w-[6rem] truncate text-center font-mono text-[10px] text-muted-foreground">
              {entry.username ?? "Аноним"}
            </p>
            <div
              className={`flex w-16 items-center justify-center rounded-t-md border border-border bg-card/60`}
              style={{ height: heights[visualPos] }}
            >
              <span className={`font-orbitron text-lg font-bold ${colors[idx]}`}>
                {["🥈", "🥇", "🥉"][visualPos]}
              </span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────────

const TABS = ["global", "friends"] as const;
type Tab = typeof TABS[number];

export default function ArenaPage() {
  const { user: currentUser } = useUser();
  const [tab, setTab] = useState<Tab>("global");
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [globalList, setGlobalList] = useState<LeaderboardUser[]>([]);

const fetchLeaderboard = useCallback(async () => {
    setPhase("loading");

    try {
      // Mock leaderboard
      await new Promise(r => setTimeout(r, 600));
      
      const mockData = [
        { id: "1", username: "cyber_ninja", xp: 12500, avatar_url: null },
        { id: "2", username: "neo_matrix", xp: 11200, avatar_url: null },
        { id: "3", username: "hacker_pro", xp: 9800, avatar_url: null },
        { id: "4", username: "script_kiddie", xp: 4500, avatar_url: null },
        { id: "5", username: "anonymous", xp: 3200, avatar_url: null }
      ];
      
      // If user is logged in, insert them if they aren't there
      if (currentUser) {
        const userInList = mockData.find(u => u.id === currentUser.id);
        if (!userInList) {
          mockData.push({
            id: currentUser.id,
            username: currentUser.username || "You",
            xp: currentUser.xp,
            avatar_url: currentUser.avatar_url || null
          });
        }
      }
      
      mockData.sort((a, b) => b.xp - a.xp);

      setGlobalList(mockData as LeaderboardUser[]);
      setPhase("ready");
    } catch (error) {
      setPhase("error");
    }
  }, [currentUser]);

  useEffect(() => { fetchLeaderboard(); }, [fetchLeaderboard]);

  const top3 = globalList.slice(0, 3);
  const restList = globalList.slice(3);

  return (
    <div className="min-h-screen bg-background cyber-grid">
      <div className="scanline fixed inset-0 z-50 pointer-events-none" />
      <GameHeader />

      <main className="mx-auto max-w-2xl px-4 py-8">

        {/* ── Title ─────────────────────────────────────────────────────────── */}
        <div className="mb-6 flex items-center justify-between">
          <motion.h1
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="font-orbitron text-2xl font-bold text-accent text-glow-blue"
          >
            ▸ АРЕНА
          </motion.h1>
          <button
            onClick={fetchLeaderboard}
            disabled={phase === "loading"}
            className="flex items-center gap-1.5 rounded border border-border px-3 py-1.5 font-mono text-xs text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all disabled:opacity-40"
          >
            <RefreshCw className={`h-3 w-3 ${phase === "loading" ? "animate-spin" : ""}`} />
            Обновить
          </button>
        </div>

        {/* ── Tabs ──────────────────────────────────────────────────────────── */}
        <div className="mb-5 flex gap-2">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex items-center gap-1.5 rounded-md px-4 py-1.5 font-orbitron text-xs uppercase tracking-wider transition-all ${
                tab === t
                  ? "bg-accent/10 text-accent border border-accent/40 box-glow-blue"
                  : "text-muted-foreground border border-transparent hover:text-foreground"
              }`}
            >
              {t === "global" ? <Globe className="h-3.5 w-3.5" /> : <Users className="h-3.5 w-3.5" />}
              {t === "global" ? "Рейтинг" : "Друзья"}
            </button>
          ))}
        </div>

        {/* ── Content ───────────────────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {phase === "loading" && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <LeaderboardSkeleton />
            </motion.div>
          )}

          {phase === "error" && (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ErrorState message="Не удалось загрузить рейтинг." onRetry={fetchLeaderboard} />
            </motion.div>
          )}

          {phase === "ready" && tab === "global" && (
            <motion.div key="global" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {globalList.length === 0 ? (
                <EmptyState icon="🏆" title="Рейтинг пуст" subtitle="Пройди миссии, чтобы попасть в топ." />
              ) : (
                <div className="space-y-3">
                  {/* Podium */}
                  {top3.length === 3 && <Podium top3={top3} />}

                  {/* Full list */}
                  <div className="space-y-1.5">
                    {globalList.map((entry, i) => (
                      <EntryRow
                        key={entry.id}
                        position={i + 1}
                        entry={entry}
                        isCurrentUser={entry.id === currentUser?.id}
                        delay={Math.min(i * 0.04, 0.5)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {phase === "ready" && tab === "friends" && (
            <motion.div key="friends" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <EmptyState
                icon="👥"
                title="Друзья не найдены"
                subtitle="Система друзей в разработке. Скоро вызывай друзей на дуэль!"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Challenge CTA ─────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-6 rounded-lg border border-neon-pink/30 bg-neon-pink/5 p-4 text-center"
        >
          <p className="font-orbitron text-sm font-bold text-neon-pink">⚔️ ВЫЗОВ</p>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            Вызови друга на дуэль — кто быстрее пройдёт миссию?
          </p>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="mt-3 rounded-md border border-neon-pink/60 bg-neon-pink/10 px-6 py-2 font-orbitron text-xs font-bold uppercase text-neon-pink transition-all hover:bg-neon-pink/20"
          >
            Бросить вызов
          </motion.button>
        </motion.div>
      </main>
    </div>
  );
}
