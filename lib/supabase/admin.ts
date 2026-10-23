import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/** Cliente exclusivamente server-side para operações administrativas do Auth. */
export function createAdminClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;

  if (!url || !key || key === "COLOQUE_SUA_NOVA_SECRET_KEY_AQUI") {
    throw new Error("SUPABASE_SECRET_KEY não está configurada no servidor.");
  }

  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
