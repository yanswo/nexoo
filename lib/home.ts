import { createClient } from "@/lib/supabase/server";

export type HomePost = {
  id: string;
  body: string;
  createdAt: string;
  authorName: string;
  authorRole: string;
  authorInitials: string;
  likeCount: number;
  commentCount: number;
  isSaved: boolean;
  topic: string;
  recommendationReason?: string;
};

export type HomeEvent = {
  id: string;
  title: string;
  startsAt: string;
  location: string;
};

function initials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts.at(-1)?.[0] ?? "")).toUpperCase();
}

function displayName(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "Usuário";
}

export async function getHomeData(): Promise<{ posts: HomePost[]; recommendedPosts: HomePost[]; events: HomeEvent[] }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: postRows, error: postsError }, { data: eventRows, error: eventsError }, { data: savedRows }, { data: likedRows }, { data: commentedRows }] =
    await Promise.all([
      supabase
        .from("posts")
        .select("id, body, topic, created_at, author_id")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("events")
        .select("id, title, starts_at, location")
        .gte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .limit(5),
      user ? supabase.from("saved_items").select("post_id").eq("user_id", user.id) : Promise.resolve({ data: [] }),
      user ? supabase.from("post_likes").select("post_id").eq("user_id", user.id) : Promise.resolve({ data: [] }),
      user ? supabase.from("comments").select("post_id").eq("author_id", user.id) : Promise.resolve({ data: [] }),
    ]);

  if (postsError) console.error("Erro ao carregar posts:", postsError.message);
  if (eventsError) console.error("Erro ao carregar eventos:", eventsError.message);

  const rows = (postRows ?? []) as Array<{
    id: string;
    body: string;
    created_at: string;
    author_id: string;
    topic: string;
  }>;
  const postIds = rows.map((post) => post.id);
  const authorIds = [...new Set(rows.map((post) => post.author_id))];

  const [{ data: profiles }, { data: likes }, { data: comments }] = await Promise.all([
    authorIds.length
      ? supabase.from("profiles").select("id, full_name, role").in("id", authorIds)
      : Promise.resolve({ data: [] }),
    postIds.length
      ? supabase.from("post_likes").select("post_id").in("post_id", postIds)
      : Promise.resolve({ data: [] }),
    postIds.length
      ? supabase.from("comments").select("post_id").in("post_id", postIds)
      : Promise.resolve({ data: [] }),
  ]);

  const profileById = new Map(
    ((profiles ?? []) as Array<{ id: string; full_name: string; role: string }>).map((profile) => [
      profile.id,
      profile,
    ])
  );
  const likeCounts = new Map<string, number>();
  const commentCounts = new Map<string, number>();
  const savedPostIds = new Set(((savedRows ?? []) as Array<{ post_id: string }>).map((row) => row.post_id));
  const likedPostIds = new Set(((likedRows ?? []) as Array<{ post_id: string }>).map((row) => row.post_id));
  const commentedPostIds = new Set(((commentedRows ?? []) as Array<{ post_id: string }>).map((row) => row.post_id));
  const interestScores = new Map<string, number>();
  for (const post of rows) {
    let points = 0;
    if (likedPostIds.has(post.id)) points += 3;
    if (savedPostIds.has(post.id)) points += 5;
    if (commentedPostIds.has(post.id)) points += 4;
    if (points) interestScores.set(post.topic, (interestScores.get(post.topic) ?? 0) + points);
  }
  const preferredTopics = [...interestScores.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  const preferredTopicNames = new Set(preferredTopics.map(([topic]) => topic));

  for (const like of (likes ?? []) as Array<{ post_id: string }>) {
    likeCounts.set(like.post_id, (likeCounts.get(like.post_id) ?? 0) + 1);
  }
  for (const comment of (comments ?? []) as Array<{ post_id: string }>) {
    commentCounts.set(comment.post_id, (commentCounts.get(comment.post_id) ?? 0) + 1);
  }

  const mappedPosts = rows.map((post) => {
      const profile = profileById.get(post.author_id);
      const authorName = displayName(profile?.full_name);
      const score = interestScores.get(post.topic) ?? 0;
      return {
        id: post.id,
        body: post.body,
        createdAt: post.created_at,
        authorName,
        authorRole: profile?.role ?? "student",
        authorInitials: initials(authorName),
        likeCount: likeCounts.get(post.id) ?? 0,
        commentCount: commentCounts.get(post.id) ?? 0,
        isSaved: savedPostIds.has(post.id),
        topic: post.topic,
        recommendationReason: preferredTopicNames.has(post.topic) ? `Porque você interagiu com ${post.topic}` : undefined,
      };
    });
  const recommendedPosts = preferredTopics.length
    ? mappedPosts.filter((post) => preferredTopicNames.has(post.topic) && post.authorName !== displayName(profileById.get(user?.id ?? "")?.full_name)).slice(0, 3)
    : [];
  return {
    posts: mappedPosts,
    recommendedPosts,
    events: ((eventRows ?? []) as Array<{
      id: string;
      title: string;
      starts_at: string;
      location: string | null;
    }>).map((event) => ({
      id: event.id,
      title: event.title,
      startsAt: event.starts_at,
      location: event.location ?? "Local não informado",
    })),
  };
}
