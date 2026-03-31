import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Edit3, Save, X, Camera, Shield, Zap, Globe, MessageCircle,
  Instagram, Calendar, Mail, Copy, Check, Loader2,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import GameHeader from "@/components/GameHeader";
import SocialLinks from "@/components/SocialLinks";
import { supabase } from "@/lib/supabase";
import { UserProfile } from "@/hooks/useUser";
import { format } from "date-fns";
import {
  PageLoader, ErrorState, Skeleton,
  getRank, getNextRank, getLevel, getLevelProgress, RANKS,
} from "@/components/ui/StatusComponents";

// ─── Constants ─────────────────────────────────────────────────────────────────

const AVATAR_BUCKET = "avatars";

// ─── Helper ────────────────────────────────────────────────────────────────────

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

// ─── XP / Rank card ────────────────────────────────────────────────────────────

function XpCard({ xp }: { xp: number }) {
  const level = getLevel(xp);
  const progress = getLevelProgress(xp);
  const rank = getRank(xp);
  const nextRank = getNextRank(xp);
  const xpInLevel = xp % 1000;

  return (
    <div className="rounded-lg border border-border bg-card/50 p-4 space-y-3">
      {/* Level + XP */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase text-muted-foreground">Уровень</p>
          <p className="font-orbitron text-3xl font-bold text-primary">{level}</p>
        </div>
        <div className="text-right">
          <p className="font-mono text-[10px] uppercase text-muted-foreground">Всего XP</p>
          <p className="font-orbitron text-xl font-bold text-neon-yellow">{xp.toLocaleString()}</p>
        </div>
      </div>

      {/* Level progress bar */}
      <div>
        <div className="mb-1 flex justify-between font-mono text-[10px] text-muted-foreground">
          <span>{xpInLevel} / 1000 XP</span>
          <span>{(1000 - xpInLevel).toLocaleString()} до уровня {level + 1}</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Rank badge */}
      <div className="flex items-center justify-between rounded-md border border-border bg-muted/20 px-3 py-2">
        <div className="flex items-center gap-2">
          <Shield className={`h-4 w-4 ${rank.color}`} />
          <span className={`font-orbitron text-xs font-bold ${rank.color}`}>{rank.label}</span>
        </div>
        {nextRank ? (
          <span className="font-mono text-[10px] text-muted-foreground">
            → {nextRank.label} @ {nextRank.minXp.toLocaleString()} XP
          </span>
        ) : (
          <span className="font-mono text-[10px] text-neon-pink">MAX RANK</span>
        )}
      </div>

      {/* Rank ladder */}
      <div className="flex gap-1 pt-1">
        {RANKS.map((r) => (
          <div
            key={r.label}
            className={`flex-1 rounded-sm py-0.5 text-center font-mono text-[8px] uppercase transition-all ${
              xp >= r.minXp
                ? "bg-primary/20 text-primary"
                : "bg-muted/20 text-muted-foreground/40"
            }`}
          >
            {r.label[0]}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Edit form ─────────────────────────────────────────────────────────────────

interface EditFormProps {
  user: UserProfile;
  onSave: (updated: Partial<UserProfile>) => Promise<void>;
  onCancel: () => void;
}

function EditForm({ user, onSave, onCancel }: EditFormProps) {
  const [form, setForm] = useState({
    username: user.username ?? "",
    full_name: user.full_name ?? "",
    telegram: user.telegram ?? "",
    instagram: user.instagram ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  const handleSave = async () => {
    if (!form.username.trim()) {
      setFieldError("Имя пользователя не может быть пустым.");
      return;
    }
    setSaving(true);
    setFieldError(null);
    await onSave(form);
    setSaving(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="rounded-lg border border-secondary/40 bg-card/60 p-5 space-y-4"
    >
      <p className="font-orbitron text-xs font-bold uppercase tracking-wider text-secondary">
        ✏ Редактировать профиль
      </p>

      {fieldError && (
        <p className="rounded border border-destructive/40 bg-destructive/5 px-3 py-2 font-mono text-xs text-destructive">
          {fieldError}
        </p>
      )}

      {[
        { label: "Имя пользователя", key: "username" as const, icon: User },
        { label: "Полное имя", key: "full_name" as const, icon: Shield },
        { label: "Telegram", key: "telegram" as const, icon: MessageCircle, prefix: "@" },
        { label: "Instagram", key: "instagram" as const, icon: Instagram, prefix: "@" },
      ].map(({ label, key, icon: Icon, prefix }) => (
        <div key={key} className="space-y-1">
          <label className="font-mono text-[10px] uppercase text-muted-foreground">{label}</label>
          <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 focus-within:border-secondary transition-colors">
            <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            {prefix && <span className="font-mono text-xs text-muted-foreground">{prefix}</span>}
            <input
              type="text"
              {...field(key)}
              className="flex-1 bg-transparent font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground/40"
              placeholder={label}
            />
          </div>
        </div>
      ))}

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" onClick={onCancel} disabled={saving} className="font-orbitron text-xs uppercase">
          <X className="mr-1 h-3 w-3" /> Отмена
        </Button>
        <Button onClick={handleSave} disabled={saving} className="font-orbitron text-xs uppercase bg-secondary text-secondary-foreground hover:bg-secondary/80">
          {saving ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Save className="mr-1 h-3 w-3" />}
          Сохранить
        </Button>
      </div>
    </motion.div>
  );
}

// ─── Avatar upload stub ─────────────────────────────────────────────────────────

interface AvatarProps {
  user: UserProfile;
  onUpload: (url: string) => void;
}

function AvatarBlock({ user, onUpload }: AvatarProps) {
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(path, file, { upsert: true });

    if (!uploadError) {
      const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
      if (data?.publicUrl) onUpload(data.publicUrl);
    } else {
      console.warn("[Profile] Avatar upload failed:", uploadError.message);
    }
    setUploading(false);
  };

  const initials = (user.username ?? "A")[0].toUpperCase();

  return (
    <div className="relative h-24 w-24 group">
      <div className="h-24 w-24 rounded-full border-2 border-primary bg-primary/10 overflow-hidden box-glow-green animate-float flex items-center justify-center">
        {user.avatar_url ? (
          <img src={user.avatar_url} alt="avatar" className="h-full w-full object-cover" />
        ) : (
          <span className="font-orbitron text-4xl font-bold text-primary">{initials}</span>
        )}
      </div>

      {/* Upload overlay */}
      <label className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
        {uploading ? (
          <Loader2 className="h-6 w-6 animate-spin text-white" />
        ) : (
          <Camera className="h-6 w-6 text-white" />
        )}
        <input type="file" accept="image/*" className="sr-only" onChange={handleFileChange} disabled={uploading} />
      </label>
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [editing, setEditing] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // ─── Fetch user ─────────────────────────────────────────────────────────────
  const loadProfile = useCallback(async () => {
    setPhase("loading");

    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser) { navigate("/auth"); return; }

    const { data, error } = await supabase
      .from("users")
      .select("id, email, username, full_name, role, xp, created_at, avatar_url, telegram, instagram")
      .eq("id", authUser.id)
      .maybeSingle();

    if (error) { console.error("[Profile] DB error:", error.message); setPhase("error"); return; }

    setUser(data as UserProfile);
    setPhase("ready");
  }, [navigate]);

  useEffect(() => {
    loadProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (!session) navigate("/auth");
    });
    return () => subscription.unsubscribe();
  }, [loadProfile, navigate]);

  // ─── Save profile edits ─────────────────────────────────────────────────────
  const handleSave = async (updates: Partial<UserProfile>) => {
    if (!user) return;
    const { error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", user.id);

    if (error) {
      setSaveMsg("Ошибка сохранения. Попробуй снова.");
    } else {
      setUser((u) => u ? { ...u, ...updates } : u);
      setSaveMsg("Профиль сохранён ✓");
      setEditing(false);
    }
    setTimeout(() => setSaveMsg(null), 3000);
  };

  // ─── Renders ────────────────────────────────────────────────────────────────
  if (phase === "loading") return <div className="min-h-screen bg-background"><GameHeader /><PageLoader label="Загрузка профиля..." /></div>;
  if (phase === "error")   return <div className="min-h-screen bg-background"><GameHeader /><main className="p-8"><ErrorState message="Не удалось загрузить профиль." onRetry={loadProfile} /></main></div>;

  const xp = user?.xp ?? 0;
  const displayUsername = user?.username ?? "Agent";
  const displayRole = user?.role ?? "Оперативник";
  const displayEmail = user?.email ?? "—";
  const displayJoined = user?.created_at ? format(new Date(user.created_at), "dd MMM yyyy") : "—";

  return (
    <div className="min-h-screen bg-background cyber-grid">
      <div className="scanline fixed inset-0 z-50 pointer-events-none" />
      <GameHeader />
      <main className="mx-auto max-w-2xl px-4 py-8 space-y-4">

        {/* ── Avatar + hero ─────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card/50 p-6"
        >
          {user && (
            <AvatarBlock
              user={user}
              onUpload={(url) => setUser((u) => u ? { ...u, avatar_url: url } : u)}
            />
          )}
          <div className="text-center">
            <h1 className="font-orbitron text-xl font-bold text-primary text-glow-green">{displayUsername}</h1>
            <p className="font-mono text-xs text-secondary mt-0.5">{displayRole}</p>
          </div>

          {user && <SocialLinks user={user} />}

          {/* Save message toast */}
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
            <EditForm user={user} onSave={handleSave} onCancel={() => setEditing(false)} />
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
    </div>
  );
}
