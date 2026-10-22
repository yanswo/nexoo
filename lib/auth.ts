import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";

export type AppUser = {
  id: string;
  name: string;
  firstName: string;
  initials: string;
  email: string;
  role: string;
  isAdmin: boolean;
};

// Pega o usuário logado de forma segura (o Supabase confirma o token no servidor).
// O cache() evita repetir a consulta várias vezes na mesma requisição.
export const getCurrentUser = cache(async (): Promise<AppUser> => {
  await connection(); // só roda quando a pessoa pede a página

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Papel (admin, aluno...) e banimento vêm do banco, nunca do navegador.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, banned_at")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.banned_at) {
    redirect("/suspenso");
  }

  const role: string = profile?.role ?? "student";
  const email = user.email ?? "";
  const metaName =
    typeof user.user_metadata?.name === "string" ? user.user_metadata.name.trim() : "";
  const name = metaName || email.split("@")[0] || "Aluno";
  const parts = name.split(/\s+/).filter(Boolean);
  const initials = (
    (parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : parts[0]?.[1] ?? "")
  ).toUpperCase();

  return {
    id: user.id,
    name,
    firstName: parts[0] ?? name,
    initials,
    email,
    role,
    isAdmin: role === "admin",
  };
});
