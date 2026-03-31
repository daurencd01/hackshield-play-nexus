import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { missions, achievements, currentPlayer } from "@/data/mockData";
import { Progress } from "@/components/ui/progress";
import GameHeader from "@/components/GameHeader";
import { Shield, Target, Flame, Calendar, Award, Edit } from "lucide-react";
import { motion } from "framer-motion";
import { UserProfile } from "@/hooks/useUser";
import { format } from "date-fns";
import SocialLinks from "@/components/SocialLinks";

export default function ProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const completedMissions = missions.filter((m) => m.status === "completed").length;
  const unlockedAchievements = achievements.filter((a) => a.unlocked).length;

  useEffect(() => {
    const init = async () => {
      // Step 1: Check session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }

      // Step 2: Server-side getUser() call for authoritative check
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser) {
        navigate('/auth');
        return;
      }

      // Step 3: Fetch profile from DB
      const { data, error } = await supabase
        .from('users')
        .select('id, email, username, full_name, role, xp, created_at, avatar_url, telegram, instagram')
        .eq('id', authUser.id)
        .maybeSingle();

      if (error) {
        // DB error — still render page, just without profile data
        console.warn('[Profile] DB fetch warning:', error.message);
      } else if (data) {
        setUser(data as UserProfile);
      }

      setLoading(false);
    };

    init();

    // Redirect on logout
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const xp = user?.xp ?? 0;
  const level = Math.floor(xp / 1000) + 1;
  const xpInLevel = xp % 1000;
  const progressPercent = (xpInLevel / 1000) * 100;

  const displayUsername = user?.username || "Agent";
  const displayRole = user?.role || "Unknown";
  const displayEmail = user?.email || "—";
  const displayJoined = user?.created_at
    ? format(new Date(user.created_at), "PPP")
    : "—";
  const displayId = user?.id || "—";

  return (
    <div className="min-h-screen bg-background cyber-grid">
      <div className="scanline fixed inset-0 z-50 pointer-events-none" />
      <GameHeader />
      <main className="mx-auto max-w-2xl px-4 py-8">
        {/* Avatar + Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative mb-6 flex flex-col items-center"
        >
          {/* Avatar circle — shows uploaded image or initials fallback */}
          <div className="relative h-24 w-24">
            <div className="h-24 w-24 rounded-full border-2 border-primary bg-primary/10 overflow-hidden box-glow-green animate-float flex items-center justify-center">
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={`${displayUsername} avatar`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="font-orbitron text-4xl font-bold text-primary">
                  {displayUsername.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          </div>
          <h1 className="mt-3 font-orbitron text-xl font-bold text-primary text-glow-green">
            {displayUsername}
          </h1>
          <p className="font-mono text-xs text-secondary">{displayRole}</p>

          {/* Social links — renders only if telegram/instagram exist */}
          {user && <SocialLinks user={user} />}

          <Link
            to="/settings"
            className="mt-4 flex items-center gap-2 rounded border border-primary/50 bg-primary/10 px-4 py-2 font-mono text-xs font-bold uppercase tracking-widest text-primary hover:bg-primary/20 transition-colors"
          >
            <Edit className="h-3 w-3" />
            Edit Profile
          </Link>
        </motion.div>

        {/* XP Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-6 rounded-lg border border-border bg-card/50 p-4"
        >
          <div className="mb-1 flex justify-between font-mono text-xs text-muted-foreground">
            <span>Level {level}</span>
            <span>{xp} XP</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
          <p className="mt-1 font-mono text-[10px] text-muted-foreground">
            {1000 - xpInLevel} XP to level {level + 1}
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
            { icon: Shield, label: "Level", value: level, color: "text-primary" },
            { icon: Target, label: "Missions", value: `${completedMissions}/${missions.length}`, color: "text-secondary" },
            { icon: Flame, label: "Streak", value: `${currentPlayer.streak} d`, color: "text-neon-pink" },
            { icon: Award, label: "Badges", value: `${unlockedAchievements}/${achievements.length}`, color: "text-neon-yellow" },
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

        {/* Account Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="rounded-lg border border-border bg-card/50 p-4"
        >
          <h2 className="mb-4 font-orbitron text-sm font-bold uppercase tracking-widest text-accent">
            Account Info
          </h2>
          <div className="space-y-4 font-mono text-sm">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase text-primary/60">Email</span>
              <span className="text-muted-foreground">{displayEmail}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase text-primary/60">Member Since</span>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>{displayJoined}</span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase text-primary/60">Account ID</span>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Shield className="h-3 w-3 shrink-0" />
                <span className="break-all text-xs">{displayId}</span>
              </div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
