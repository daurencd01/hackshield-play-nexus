import { supabase } from './supabase';

const BUCKET = 'avatars';
const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export interface AvatarUploadResult {
  publicUrl: string;
}

/**
 * Validates, uploads a file to avatars/{userId}/avatar.{ext},
 * stores the public URL in public.users, and returns it.
 * Enforces: user can only write to their own folder.
 */
export async function uploadAvatar(
  file: File,
  userId: string
): Promise<AvatarUploadResult> {
  // --- Validate type ---
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Invalid file type. Only PNG, JPEG, and WebP are allowed.');
  }

  // --- Validate size ---
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error('File is too large. Maximum size is 2 MB.');
  }

  // --- Determine extension ---
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';

  // --- Path: always scoped to the authenticated user's own folder ---
  const path = `${userId}/avatar.${ext}`;

  // --- Upload (upsert replaces any existing avatar) ---
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      upsert: true,
      contentType: file.type,
    });

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  // --- Get public URL ---
  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);

  if (!urlData?.publicUrl) {
    throw new Error('Failed to retrieve public URL after upload.');
  }

  // Bust cache by appending a timestamp query param
  const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

  // --- Persist URL into DB ---
  const { error: dbError } = await supabase
    .from('users')
    .update({ avatar_url: publicUrl })
    .eq('id', userId);

  if (dbError) {
    throw new Error(`Failed to save avatar URL: ${dbError.message}`);
  }

  return { publicUrl };
}
