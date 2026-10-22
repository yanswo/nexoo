"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type CommunityCreateState = { error?: string; success?: boolean };

export async function createCommunity(_previous: CommunityCreateState, formData: FormData): Promise<CommunityCreateState> {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const color = String(formData.get("color") ?? "#4e82b8");
  if (name.length < 2) return { error: "Informe um nome para a comunidade." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sua sessão expirou. Entre novamente." };
  const slug = `${name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${user.id.slice(0, 6)}`;
  const { data: community, error } = await supabase.from("communities").insert({ owner_id: user.id, name, slug, description, color, visibility: "school" }).select("id").single();
  if (error || !community) return { error: error?.message.includes("student_can_own_one_community") ? "Cada aluno pode criar apenas uma comunidade." : "Não foi possível criar a comunidade." };
  const { error: memberError } = await supabase.from("community_members").insert({ community_id: community.id, user_id: user.id, role: "owner" });
  if (memberError) return { error: "Comunidade criada, mas não foi possível concluir sua entrada nela." };
  revalidatePath("/comunidades");
  return { success: true };
}

export async function joinCommunity(formData: FormData) {
  const communityId = String(formData.get("communityId") ?? "");
  if (!communityId) return;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase.from("community_members").insert({ community_id: communityId, user_id: user.id });
  if (error && error.code !== "23505") console.error("Erro ao entrar na comunidade:", error.message);
  revalidatePath("/comunidades");
}

export async function leaveCommunity(formData: FormData) {
  const communityId = String(formData.get("communityId") ?? "");
  if (!communityId) return;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase.from("community_members").delete().eq("community_id", communityId).eq("user_id", user.id);
  if (error) console.error("Erro ao sair da comunidade:", error.message);
  revalidatePath("/comunidades");
}
