import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { uploadAvatar } from "@/lib/avatarUpload";
import { motion } from "framer-motion";
import GameHeader from "@/components/GameHeader";
import { Target, AlertCircle, Save, CheckCircle, Camera, Loader2 } from "lucide-react";

export default function SettingsPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auth state
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form state
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("");
  const [telegram, setTelegram] = useState("");
  const [instagram, setInstagram] = useState("");

  // Avatar state
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  // Form submission state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      // Step 1: Check session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }

      // Step 2: Server-side verify
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        navigate('/auth');
        return;
      }

      setUserId(user.id);

      // Step 3: Fetch profile from DB
      const { data, error: dbError } = await supabase
        .from('users')
        .select('username, full_name, role, avatar_url, telegram, instagram')
        .eq('id', user.id)
        .maybeSingle();

      if (!dbError && data) {
        setUsername(data.username || "");
        setFullName(data.full_name || "");
        setRole(data.role || "");
        setAvatarUrl(data.avatar_url || null);
        setTelegram(data.telegram || "");
        setInstagram(data.instagram || "");
      }

      setSessionReady(true);
      setLoading(false);
    };

    init();

    // Redirect on logout
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (!session) navigate('/auth');
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // --- Avatar upload handler ---
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    setAvatarError(null);

    // Show immediate local preview — no waiting for upload
    const localPreview = URL.createObjectURL(file);
    setAvatarPreview(localPreview);

    setUploading(true);
    try {
      const { publicUrl } = await uploadAvatar(file, userId);
      setAvatarUrl(publicUrl);
      setAvatarPreview(null); // drop the blob URL — use the real one
    } catch (err: any) {
      setAvatarError(err.message || "Upload failed.");
      setAvatarPreview(null); // revert preview on error
    } finally {
      setUploading(false);
      // Reset input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // --- Profile save handler ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const normalizedUsername = username.toLowerCase().trim();
    if (!normalizedUsername || !role.trim()) {
      setError("Username and Role are required.");
      return;
    }

    // Re-verify session before write
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate('/auth'); return; }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate('/auth'); return; }

    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from('users')
        .update({
          username: normalizedUsername,
          full_name: fullName.trim() || null,
          role: role.trim(),
          telegram: telegram.trim().replace(/^@/, '') || null,
          instagram: instagram.trim().replace(/^@/, '') || null,
        })
        .eq('id', user.id);

      if (updateError) {
        if (updateError.code === '23505') {
          setError("Username already taken. Please choose another.");
        } else {
          setError(updateError.message || "An error occurred while updating.");
        }
        return;
      }

      setSuccess("Profile updated successfully!");
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const displaySrc = avatarPreview || avatarUrl;
  const initials = username ? username.charAt(0).toUpperCase() : "?";

  return (
    <div className="min-h-screen bg-background cyber-grid">
      <div className="scanline fixed inset-0 z-50 pointer-events-none" />
      <GameHeader />
      <main className="mx-auto max-w-lg px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-border bg-card/80 p-6 backdrop-blur"
        >
          {/* Header icon */}
          <div className="mb-4 flex items-center justify-center">
            <Target className="h-10 w-10 text-primary text-glow-green" />
          </div>
          <h1 className="mb-1 text-center font-orbitron text-2xl font-bold text-primary tracking-widest uppercase">
            Settings
          </h1>
          <p className="mb-6 text-center font-mono text-xs text-muted-foreground uppercase">
            Configure your identity
          </p>

          {/* ─── Avatar Upload Section ─── */}
          <div className="mb-6 flex flex-col items-center gap-3">
            {/* Avatar circle */}
            <div className="relative">
              <div className="h-24 w-24 rounded-full border-2 border-primary bg-primary/10 overflow-hidden box-glow-green flex items-center justify-center">
                {displaySrc ? (
                  <img
                    src={displaySrc}
                    alt="avatar"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="font-orbitron text-3xl font-bold text-primary">
                    {initials}
                  </span>
                )}
              </div>

              {/* Overlay spinner during upload */}
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/70">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              )}
            </div>

            {/* Upload button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={!sessionReady || uploading}
              className="flex items-center gap-2 rounded border border-primary/40 bg-primary/10 px-4 py-2 font-mono text-xs font-bold uppercase tracking-widest text-primary transition-colors hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Camera className="h-3 w-3" />
              )}
              {uploading ? "Uploading..." : "Change Avatar"}
            </button>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />

            {/* Avatar-specific error */}
            {avatarError && (
              <div className="flex items-center gap-2 rounded bg-destructive/10 px-3 py-2 text-xs text-destructive border border-destructive/20 w-full">
                <AlertCircle className="h-3 w-3 shrink-0" />
                <span>{avatarError}</span>
              </div>
            )}

            <p className="font-mono text-[10px] text-muted-foreground uppercase">
              PNG, JPEG, or WebP · Max 2 MB
            </p>
          </div>

          {/* ─── Profile Form ─── */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 rounded bg-primary/10 p-3 text-sm text-primary border border-primary/20">
                <CheckCircle className="h-4 w-4 shrink-0" />
                <p>{success}</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="font-mono text-xs text-muted-foreground uppercase">
                Username *
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={!sessionReady || saving}
                className="w-full rounded border border-border bg-background p-2 font-mono text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="font-mono text-xs text-muted-foreground uppercase">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={!sessionReady || saving}
                className="w-full rounded border border-border bg-background p-2 font-mono text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
              />
            </div>

            <div className="space-y-2">
              <label className="font-mono text-xs text-muted-foreground uppercase">
                Role *
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                disabled={!sessionReady || saving}
                className="w-full rounded border border-border bg-background p-2 font-mono text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                required
              >
                <option value="" disabled>Select your role</option>
                <option value="Student">Student</option>
                <option value="School Student">School Student</option>
                <option value="Beginner">Beginner</option>
                <option value="Enthusiast">Enthusiast</option>
                <option value="Advanced User">Advanced User</option>
              </select>
            </div>

            {/* ─── Social Links ─── */}
            <div className="pt-2 border-t border-border/50">
              <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Social Links (optional)
              </p>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="font-mono text-xs text-muted-foreground uppercase">
                    Telegram
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-muted-foreground">@</span>
                    <input
                      type="text"
                      value={telegram}
                      onChange={(e) => setTelegram(e.target.value)}
                      disabled={!sessionReady || saving}
                      placeholder="username"
                      className="w-full rounded border border-border bg-background p-2 font-mono text-sm text-foreground focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 disabled:opacity-50"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-mono text-xs text-muted-foreground uppercase">
                    Instagram
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-muted-foreground">@</span>
                    <input
                      type="text"
                      value={instagram}
                      onChange={(e) => setInstagram(e.target.value)}
                      disabled={!sessionReady || saving}
                      placeholder="username"
                      className="w-full rounded border border-border bg-background p-2 font-mono text-sm text-foreground focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500/50 disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={!sessionReady || saving}
                className="flex w-full items-center justify-center gap-2 rounded bg-primary p-3 font-orbitron text-sm font-bold uppercase tracking-widest text-primary-foreground transition-all hover:bg-primary/90 hover:box-glow-green disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saving ? "Saving..." : "Update Profile"}
              </button>
            </div>

            {/* Delete Account: requires server-side admin API — not implemented on frontend */}
          </form>
        </motion.div>
      </main>
    </div>
  );
}
