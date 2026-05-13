import { useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { UserProfile } from "@/hooks/useUser";

interface AvatarUploadProps {
  user: UserProfile;
  onUpload: (file: File) => Promise<string | null>;
  onUrlUpdate: (url: string) => void;
}

export function AvatarUpload({ user, onUpload, onUrlUpdate }: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const url = await onUpload(file);
    if (url) onUrlUpdate(url);
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
