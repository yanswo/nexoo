import { createClient } from "@/lib/supabase/server";

export type ProfileInterest = {
  topic: string;
  score: number;
  interactions: number;
};

export type ProfileData = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  bio: string;
  avatarUrl: string | null;
  interests: ProfileInterest[];
};

export async function getProfileData(): Promise<ProfileData | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const [{ data: profile }, { data: likedRows }, { data: savedRows }, { data: commentRows }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, role, bio, avatar_url").eq("id", user.id).maybeSingle(),
    supabase.from("post_likes").select("post_id").eq("user_id", user.id),
    supabase.from("saved_items").select("post_id").eq("user_id", user.id),
    supabase.from("comments").select("post_id").eq("author_id", user.id),
  ]);

  const postScores = new Map<string, { score: number; interactions: number }>();
  const addPostScores = (rows: unknown[] | null, weight: number) => {
    for (const row of rows ?? []) {
      const postId = (row as { post_id?: string }).post_id;
      if (!postId) continue;
      const current = postScores.get(postId) ?? { score: 0, interactions: 0 };
      postScores.set(postId, {
        score: current.score + weight,
        interactions: current.interactions + 1,
      });
    }
  };

  addPostScores(likedRows, 3);
  addPostScores(savedRows, 5);
  addPostScores(commentRows, 4);

  const topicScores = new Map<string, { score: number; interactions: number }>();
  if (postScores.size) {
    const { data: posts } = await supabase
      .from("posts")
      .select("id, topic")
      .in("id", [...postScores.keys()]);

    for (const post of posts ?? []) {
      const topic = typeof post.topic === "string" && post.topic.trim() ? post.topic.trim() : "Outros";
      const postScore = postScores.get(post.id);
      if (!postScore) continue;
      const current = topicScores.get(topic) ?? { score: 0, interactions: 0 };
      topicScores.set(topic, {
        score: current.score + postScore.score,
        interactions: current.interactions + postScore.interactions,
      });
    }
  }

  const interests = [...topicScores.entries()]
    .map(([topic, value]) => ({ topic, ...value }))
    .sort((a, b) => b.score - a.score || b.interactions - a.interactions)
    .slice(0, 3);

  return { id: user.id, fullName: profile?.full_name || String(user.user_metadata?.name ?? user.email?.split("@")[0] ?? "Aluno"), email: user.email ?? "", role: profile?.role ?? "student", bio: profile?.bio ?? "", avatarUrl: profile?.avatar_url ?? null, interests };
}
