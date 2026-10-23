"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ProfileState = { error?: string; success?: boolean } | null;

export async function updateProfile(_previous: ProfileState, formData: FormData): Promise<ProfileState> {
  const name = String(formData.get("name") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const attachment = formData.get("avatar");
  const file = attachment && typeof attachment === "object" && "size" in attachment ? attachment as File : null;
  if (name.length < 2) return { error: "Informe um nome válido." };
  if (bio.length > 240) return { error: "A bio pode ter no máximo 240 caracteres." };
  if (file && file.size > 0 && (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 2 * 1024 * 1024)) return { error: "A foto deve ser JPG, PNG ou WEBP e ter no máximo 2 MB." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sua sessão expirou." };
  let avatarUrl: string | undefined;
  if (file && file.size > 0) {
    const path = `${user.id}/avatar-${Date.now()}.${file.type.split("/")[1]}`;
    const { error: uploadError } = await supabase.storage.from("profile-avatars").upload(path, file, { contentType: file.type, upsert: true });
    if (uploadError) return { error: `Não foi possível enviar a foto: ${uploadError.message}` };
    avatarUrl = supabase.storage.from("profile-avatars").getPublicUrl(path).data.publicUrl;
  }
  const { error } = await supabase.from("profiles").update({ full_name: name, bio, ...(avatarUrl ? { avatar_url: avatarUrl } : {}) }).eq("id", user.id);
  if (error) return { error: "Não foi possível salvar seu perfil." };
  await supabase.auth.updateUser({ data: { name } });
  revalidatePath("/perfil");
  revalidatePath("/inicio");
  return { success: true };
}
