import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Edit3, Check, Copy, Mail, Calendar, Globe 
} from "lucide-react";
import { format } from "date-fns";
import { Layout } from "@/components/Layout";
import SocialLinks from "@/components/SocialLinks";
import { 
  PageLoader, ErrorState, getRank, getLevel 
} from "@/components/ui/StatusComponents";
import { Button } from "@/components/ui/button";
import { useProfileManager } from "@/hooks/profile/useProfileManager";
import { XpCard } from "@/components/profile/XpCard";
import { AvatarUpload } from "@/components/profile/AvatarUpload";
import { ProfileForm } from "@/components/profile/ProfileForm";

function CopyableText({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
    >
      <span className="max-w-[18ch] truncate">{value}</span>
      {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

export default function ProfilePage() {
  const {
    user,
    setUser,
    phase,
    saveMsg,
    handleSave,
    uploadAvatar,
    loadProfile
  } = useProfileManager();
  
  const [editing, setEditing] = useState(false);

  if (phase === "loading") return <Layout title="Профиль"><PageLoader label="Загрузка профиля..." /></Layout>;
  if (phase === "error")   return <Layout title="Профиль"><main className="p-8"><ErrorState message="Не удалось загрузить профиль." onRetry={loadProfile} /></main></Layout>;

  const xp = user?.xp ?? 0;
  const displayUsername = user?.username ?? "Agent";
  const displayRole = user?.role ?? "Оперативник";
  const displayEmail = user?.email ?? "—";
  const displayJoined = user?.created_at ? format(new Date(user.created_at), "dd MMM yyyy") : "—";

  return (
    <Layout title="Профиль">
      <main className="mx-auto max-w-2xl px-4 py-6 space-y-4">

        {/* ── Avatar + hero ─────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card/50 p-6"
        >
          {user && (
            <AvatarUpload
              user={user}
              onUpload={uploadAvatar}
              onUrlUpdate={(url) => setUser((u) => u ? { ...u, avatar_url: url } : u)}
            />
          )}
          <div className="text-center">
            <h1 className="font-orbitron text-xl font-bold text-primary text-glow-green">{displayUsername}</h1>
            <p className="font-mono text-xs text-secondary mt-0.5">{displayRole}</p>
          </div>

          {user && <SocialLinks user={user} />}

          <AnimatePresence>
            {saveMsg && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`font-mono text-xs ${saveMsg.includes("✓") ? "text-primary" : "text-destructive"}`}
              >
                {saveMsg}
              </motion.p>
            )}
          </AnimatePresence>

          <Button
            onClick={() => setEditing((e) => !e)}
            variant="outline"
            className="border-primary/50 font-orbitron text-xs uppercase text-primary hover:bg-primary/10"
          >
            <Edit3 className="mr-1.5 h-3 w-3" />
            {editing ? "Скрыть" : "Редактировать"}
          </Button>
        </motion.div>

        {/* ── Edit form ─────────────────────────────────────────────────────── */}
        <AnimatePresence>
          {editing && user && (
            <ProfileForm user={user} onSave={handleSave} onCancel={() => setEditing(false)} />
          )}
        </AnimatePresence>

        {/* ── XP / Rank card ───────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          <XpCard xp={xp} />
        </motion.div>

        {/* ── Stats row ─────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="grid grid-cols-3 gap-3"
        >
          {[
            { icon: "⚡", label: "XP", value: xp.toLocaleString(), color: "text-neon-yellow" },
            { icon: "🏆", label: "Уровень", value: String(getLevel(xp)), color: "text-primary" },
            { icon: "🛡", label: "Ранг", value: getRank(xp).label, color: getRank(xp).color },
          ].map((s) => (
            <div key={s.label} className="flex flex-col items-center gap-1 rounded-lg border border-border bg-card/50 p-3">
              <span className="text-xl">{s.icon}</span>
              <span className="font-mono text-[10px] uppercase text-muted-foreground">{s.label}</span>
              <span className={`font-orbitron text-sm font-bold ${s.color}`}>{s.value}</span>
            </div>
          ))}
        </motion.div>

        {/* ── Account info ─────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="rounded-lg border border-border bg-card/50 p-4 space-y-4"
        >
          <h2 className="font-orbitron text-xs font-bold uppercase tracking-widest text-accent">
            Аккаунт
          </h2>

          {[
            { icon: Mail, label: "Email", value: displayEmail },
            { icon: Calendar, label: "Дата регистрации", value: displayJoined },
            { icon: Globe, label: "ID", value: user?.id ?? "—", copyable: true },
          ].map(({ icon: Icon, label, value, copyable }) => (
            <div key={label} className="flex items-start gap-3">
              <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <div>
                <p className="font-mono text-[10px] uppercase text-muted-foreground">{label}</p>
                {copyable ? (
                  <CopyableText value={value} />
                ) : (
                  <p className="font-mono text-xs text-foreground">{value}</p>
                )}
              </div>
            </div>
          ))}
        </motion.div>
      </main>
    </Layout>
  );
}
