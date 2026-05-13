import React, { useState } from "react";
import { User, Shield, MessageCircle, X, Save, Loader2 } from "lucide-react";
import { FaInstagram } from "react-icons/fa";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { UserProfile } from "@/hooks/useUser";

interface ProfileFormProps {
  user: UserProfile;
  onSave: (updated: Partial<UserProfile>) => Promise<void>;
  onCancel: () => void;
}

export function ProfileForm({ user, onSave, onCancel }: ProfileFormProps) {
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

  const fields = [
    { label: "Имя пользователя", key: "username" as const, icon: User },
    { label: "Полное имя",       key: "full_name" as const, icon: Shield },
    { label: "Telegram",         key: "telegram" as const, icon: MessageCircle, prefix: "@" },
    { label: "Instagram",        key: "instagram" as const, icon: FaInstagram,   prefix: "@" },
  ];

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

      {fields.map(({ label, key, icon: Icon, prefix }) => (
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
