"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type CommunityPostState = { message?: string; error?: string; success?: boolean };

export async function createCommunityPost(_previous: CommunityPostState, formData: FormData): Promise<CommunityPostState> {
  const communityId = String(formData.get("communityId") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const topic = String(formData.get("topic") ?? "Geral").trim() || "Geral";
  const attachment = formData.get("attachment");
  if (!communityId || !slug) return { error: "Comunidade inválida." };
  if (!body) return { error: "Escreva algo antes de publicar." };
  if (body.length > 5000) return { error: "A publicação pode ter no máximo 5.000 caracteres." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sua sessão expirou. Entre novamente." };

  const file = attachment && typeof attachment === "object" && "size" in attachment ? attachment as File : null;
  if (file && file.size > 0 && (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024)) return { error: "A imagem deve ser válida e ter no máximo 5 MB." };
  let attachmentPath: string | null = null;
  if (file && file.size > 0) {
    attachmentPath = `${user.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
    const { error: uploadError } = await supabase.storage.from("school-posts").upload(attachmentPath, file, { contentType: file.type, upsert: false });
    if (uploadError) { console.error("Erro no upload da imagem:", uploadError.message); return { error: `Não foi possível enviar a imagem: ${uploadError.message}` }; }
  }
  const { error } = await supabase.from("posts").insert({ author_id: user.id, community_id: communityId, body, topic, attachment_path: attachmentPath });
  if (error) {
    console.error("Erro ao publicar na comunidade:", error.message);
    return { error: "Entre na comunidade para publicar." };
  }
  revalidatePath(`/comunidades/${slug}`);
  revalidatePath("/comunidades");
  revalidatePath("/inicio");
  return { success: true };
}
