"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function removeSavedItem(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const postId = String(formData.get("postId") ?? "");
  if (!postId) return { ok: false, error: "Item inválido." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sua sessão expirou." };
  const { error } = await supabase.from("saved_items").delete().eq("user_id", user.id).eq("post_id", postId);
  if (error) { console.error("Erro ao remover item salvo:", error.message); return { ok: false, error: "Não foi possível remover o item." }; }
  revalidatePath("/salvos");
  revalidatePath("/inicio");
  return { ok: true };
}
