"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function readId(formData: FormData, field: string) {
  const value = String(formData.get(field) ?? "");
  return UUID.test(value) ? value : null;
}

function refresh() {
  revalidatePath("/inicio");
  revalidatePath("/admin");
}

// Quem pode apagar o quê é decidido pelo banco (RLS): o autor apaga o próprio post
// e o admin apaga qualquer um. Se alguém sem permissão tentar, nada é apagado.
export async function deletePost(formData: FormData) {
  const postId = readId(formData, "postId");
  if (!postId) return;
  const supabase = await createClient();
  const { error } = await supabase.from("posts").delete().eq("id", postId);
  if (error) console.error("Erro ao remover post:", error.message);
  refresh();
}

export async function banUser(formData: FormData) {
  const userId = readId(formData, "userId");
  if (!userId) return;
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_ban_user", { target: userId, delete_content: true });
  if (error) console.error("Erro ao banir usuário:", error.message);
  refresh();
}

export async function unbanUser(formData: FormData) {
  const userId = readId(formData, "userId");
  if (!userId) return;
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_unban_user", { target: userId });
  if (error) console.error("Erro ao reativar usuário:", error.message);
  refresh();
}

export async function setAdmin(formData: FormData) {
  const userId = readId(formData, "userId");
  if (!userId) return;
  const makeAdmin = formData.get("makeAdmin") === "true";
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_admin", { target: userId, make_admin: makeAdmin });
  if (error) console.error("Erro ao mudar permissão:", error.message);
  refresh();
}
