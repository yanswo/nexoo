import { createClient } from "@/lib/supabase/server";

export type ProfileData = { id: string; fullName: string; email: string; role: string; bio: string; avatarUrl: string | null };

export async function getProfileData(): Promise<ProfileData | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("id, full_name, role, bio, avatar_url").eq("id", user.id).maybeSingle();
  return { id: user.id, fullName: profile?.full_name || String(user.user_metadata?.name ?? user.email?.split("@")[0] ?? "Aluno"), email: user.email ?? "", role: profile?.role ?? "student", bio: profile?.bio ?? "", avatarUrl: profile?.avatar_url ?? null };
}
