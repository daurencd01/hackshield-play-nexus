import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { UserProfile } from "@/types/game";

const AVATAR_BUCKET = "avatars";

export function useProfileManager() {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    setPhase("loading");

    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser) { 
      navigate("/auth"); 
      return; 
    }

    let { data, error } = await (supabase
      .from("profiles") as any)
      .select("id, email, username, full_name, role, xp, created_at, avatar_url, telegram, instagram")
      .eq("id", authUser.id)
      .maybeSingle();

    if (error) { 
      console.error("[Profile] DB error:", error.message); 
      setPhase("error"); 
      return; 
    }

    if (!data) {
      const newProfile = {
        id: authUser.id,
        username: authUser.email?.split('@')[0] || 'user',
        full_name: '',
        role: 'student',
        email: authUser.email,
        updated_at: new Date().toISOString()
      };
      const { data: created, error: createError } = await (supabase
        .from('profiles') as any)
        .upsert(newProfile)
        .select()
        .single();
        
      if (createError) {
        setPhase("error");
        return;
      }
      data = created;
    }

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

  const handleSave = async (updates: Partial<UserProfile>) => {
    if (!user) return;
    const { error } = await (supabase
      .from("profiles") as any)
      .update(updates)
      .eq("id", user.id);

    if (error) {
      setSaveMsg("Ошибка сохранения. Попробуй снова.");
    } else {
      setUser((u) => u ? { ...u, ...updates } : u);
      setSaveMsg("Профиль сохранён ✓");
    }
    setTimeout(() => setSaveMsg(null), 3000);
  };

  const uploadAvatar = async (file: File) => {
    if (!user) return null;
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(path, file, { upsert: true });

    if (!uploadError) {
      const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
      if (data?.publicUrl) {
        await handleSave({ avatar_url: data.publicUrl });
        return data.publicUrl;
      }
    }
    return null;
  };

  return {
    user,
    setUser,
    phase,
    saveMsg,
    handleSave,
    uploadAvatar,
    loadProfile
  };
}
