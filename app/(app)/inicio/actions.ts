"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type PublishState = { error?: string; success?: boolean } | null;

export async function publishPost(_previous: PublishState, formData: FormData): Promise<PublishState> {
  const body = String(formData.get("body") ?? "").trim();
  const topic = String(formData.get("topic") ?? "Geral").trim() || "Geral";
  const attachment = formData.get("attachment");
  if (!body) return { error: "Escreva algo antes de publicar." };
  if (body.length > 5000) return { error: "A publicação pode ter no máximo 5.000 caracteres." };
  const file = attachment && typeof attachment === "object" && "size" in attachment ? attachment as File : null;
  if (file && file.size > 0 && (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024)) return { error: "A imagem deve ser válida e ter no máximo 5 MB." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Sua sessão expirou. Entre novamente." };

  let attachmentPath: string | null = null;
  if (file && file.size > 0) {
    attachmentPath = `${user.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
    const { error: uploadError } = await supabase.storage.from("school-posts").upload(attachmentPath, file, { contentType: file.type, upsert: false });
    if (uploadError) { console.error("Erro no upload da imagem:", uploadError.message); return { error: `Não foi possível enviar a imagem: ${uploadError.message}` }; }
  }
  const { error } = await supabase.from("posts").insert({ author_id: user.id, body, topic, attachment_path: attachmentPath });
  if (error) {
    console.error("Erro ao publicar post:", error.message);
    const friendly = error.message.startsWith("Nexo:") ? error.message.slice(5).trim() : null;
    return { error: friendly ?? "Não foi possível publicar agora." };
  }

  revalidatePath("/inicio");
  return { success: true };
}

export async function savePost(formData: FormData) {
  const postId = String(formData.get("postId") ?? "");
  if (!postId) return;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase.from("saved_items").upsert({ user_id: user.id, post_id: postId, collection: "Geral" }, { onConflict: "user_id,post_id" });
  if (error) console.error("Erro ao salvar post:", error.message);
  revalidatePath("/inicio");
  revalidatePath("/salvos");
}

export async function removeSavedPost(formData: FormData) {
  const postId = String(formData.get("postId") ?? "");
  if (!postId) return;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from("saved_items")
    .delete()
    .eq("user_id", user.id)
    .eq("post_id", postId);

  if (error) {
    console.error("Erro ao remover post salvo:", error.message);
    return;
  }

  revalidatePath("/inicio");
  revalidatePath("/salvos");
}
