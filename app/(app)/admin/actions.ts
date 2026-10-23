"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function readId(formData: FormData, field: string) {
  const value = String(formData.get(field) ?? "");
  return UUID.test(value) ? value : null;
}

function refresh() {
  revalidatePath("/inicio");
  revalidatePath("/admin");
}

async function getAdminClient() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, banned_at")
    .eq("id", user.id)
    .maybeSingle();
  return profile?.role === "admin" && !profile.banned_at ? supabase : null;
}

async function writeAudit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  action: string
) {
  const { error } = await supabase.rpc("admin_log_audit", { action });
  if (error) console.error("Erro ao registrar auditoria:", error.message);
}

export async function deletePost(formData: FormData) {
  const postId = readId(formData, "postId");
  if (!postId) return;
  const supabase = await getAdminClient();
  if (!supabase) return;
  const { error } = await supabase.from("posts").delete().eq("id", postId);
  if (error) console.error("Erro ao remover post:", error.message);
  else await writeAudit(supabase, "Removeu uma publicacao");
  refresh();
}

export async function banUser(formData: FormData) {
  const userId = readId(formData, "userId");
  if (!userId) return;
  const supabase = await getAdminClient();
  if (!supabase) return;
  const { error } = await supabase.rpc("admin_ban_user", { target: userId, delete_content: true });
  if (error) console.error("Erro ao banir usuario:", error.message);
  else await writeAudit(supabase, "Suspendeu um usuario");
  refresh();
}

export async function unbanUser(formData: FormData) {
  const userId = readId(formData, "userId");
  if (!userId) return;
  const supabase = await getAdminClient();
  if (!supabase) return;
  const { error } = await supabase.rpc("admin_unban_user", { target: userId });
  if (error) console.error("Erro ao reativar usuario:", error.message);
  else await writeAudit(supabase, "Reativou um usuario");
  refresh();
}

export type ResetPasswordResult = {
  ok: boolean;
  message: string;
  password?: string;
};

export async function resetPassword(formData: FormData): Promise<ResetPasswordResult> {
  const userId = readId(formData, "userId");
  const password = String(formData.get("password") ?? "");
  if (!userId || password.length < 8) {
    return { ok: false, message: "Informe uma senha com pelo menos 8 caracteres." };
  }
  const supabase = await getAdminClient();
  if (!supabase) return { ok: false, message: "Sessão administrativa inválida." };

  try {
    const adminSupabase = createAdminClient();
    const { data: targetData, error: targetError } = await adminSupabase.auth.admin.getUserById(userId);
    if (targetError || !targetData.user) {
      return { ok: false, message: "Não foi possível localizar o usuário." };
    }

    const { error } = await adminSupabase.auth.admin.updateUserById(userId, { password });
    if (error) {
      console.error("Erro ao redefinir senha:", error.message);
      return { ok: false, message: "Não foi possível redefinir a senha." };
    }

    const email = targetData.user.email ?? `usuário ${userId}`;
    await writeAudit(supabase, `Senha do usuário ${email} foi redefinida`);
    refresh();
    return { ok: true, message: "Senha redefinida com sucesso!", password };
  } catch (error) {
    console.error("Erro ao redefinir senha:", error);
    return { ok: false, message: "A operação administrativa não está configurada no servidor." };
  }
}

export async function resetQuiz() {
  const supabase = await getAdminClient();
  if (!supabase) return;
  const { error } = await supabase.rpc("admin_reset_quiz");
  if (error) console.error("Erro ao zerar quiz:", error.message);
  else await writeAudit(supabase, "Zerou o ranking do quiz");
  revalidatePath("/quiz");
  revalidatePath("/quiz/ranking");
}

export async function setAdmin(formData: FormData) {
  const userId = readId(formData, "userId");
  if (!userId) return;
  const makeAdmin = formData.get("makeAdmin") === "true";
  const supabase = await getAdminClient();
  if (!supabase) return;
  const { error } = await supabase.rpc("admin_set_admin", { target: userId, make_admin: makeAdmin });
  if (error) console.error("Erro ao mudar permissao:", error.message);
  else await writeAudit(supabase, makeAdmin ? "Promoveu um usuario a administrador" : "Removeu permissao de administrador");
  refresh();
}

