import { createClient } from "@/lib/supabase/server";

export type AgendaEvent = {
  id: string;
  title: string;
  description: string;
  category: "assessment" | "club" | "project" | "meeting" | "other";
  location: string;
  startsAt: string;
  endsAt: string | null;
  createdBy: string;
};

export async function getAgendaEvents(): Promise<AgendaEvent[]> {
  const supabase = await createClient();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  const { data, error } = await supabase.from("events")
    .select("id, title, description, category, location, starts_at, ends_at, created_by")
    .gte("starts_at", from.toISOString())
    .limit(500)
    .order("starts_at", { ascending: true });

  if (error) {
    console.error("Erro ao carregar agenda:", error.message);
    return [];
  }

  return ((data ?? []) as Array<{ id: string; title: string; description: string; category: AgendaEvent["category"]; location: string | null; starts_at: string; ends_at: string | null; created_by: string }>).map((event) => ({
    id: event.id, title: event.title, description: event.description, category: event.category,
    location: event.location ?? "Local não informado", startsAt: event.starts_at,
    endsAt: event.ends_at, createdBy: event.created_by,
  }));
}
