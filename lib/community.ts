import { createClient } from "@/lib/supabase/server";

export type CommunityPost = {
  id: string;
  body: string;
  createdAt: string;
  authorName: string;
  authorInitials: string;
  likeCount: number;
  commentCount: number;
  topic: string;
  comments: CommunityComment[];
  attachmentUrl?: string;
};

export type CommunityComment = { id: string; body: string; createdAt: string; authorName: string; authorInitials: string };

export type CommunityDetails = {
  id: string;
  name: string;
  slug: string;
  description: string;
  color: string;
  memberCount: number;
  isMember: boolean;
  posts: CommunityPost[];
};

function initials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts.at(-1)?.[0] ?? "")).toUpperCase();
}

export async function getCommunityBySlug(slug: string): Promise<CommunityDetails | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: community, error: communityError } = await supabase
    .from("communities")
    .select("id, name, slug, description, color")
    .eq("slug", slug)
    .maybeSingle();

  if (communityError || !community) return null;

  const [{ data: members }, { data: postRows }] = await Promise.all([
    supabase.from("community_members").select("user_id").eq("community_id", community.id),
    supabase.from("posts").select("id, body, topic, attachment_path, created_at, author_id").eq("community_id", community.id).order("created_at", { ascending: false }).limit(50),
  ]);

  const rows = (postRows ?? []) as Array<{ id: string; body: string; topic: string; attachment_path: string | null; created_at: string; author_id: string }>;
  const postIds = rows.map((post) => post.id);
  const authorIds = [...new Set(rows.map((post) => post.author_id))];
  const [{ data: profiles }, { data: likes }, { data: comments }] = await Promise.all([
    authorIds.length ? supabase.from("profiles").select("id, full_name").in("id", authorIds) : Promise.resolve({ data: [] }),
    postIds.length ? supabase.from("post_likes").select("post_id").in("post_id", postIds) : Promise.resolve({ data: [] }),
    postIds.length ? supabase.from("comments").select("id, post_id, body, created_at, author_id").in("post_id", postIds).order("created_at", { ascending: true }) : Promise.resolve({ data: [] }),
  ]);

  const commentRows = (comments ?? []) as Array<{ id: string; post_id: string; body: string; created_at: string; author_id: string }>;
  const missingAuthorIds = [...new Set(commentRows.map((comment) => comment.author_id))].filter((id) => !authorIds.includes(id));
  const { data: commentProfiles } = missingAuthorIds.length ? await supabase.from("profiles").select("id, full_name").in("id", missingAuthorIds) : { data: [] };
  const names = new Map([...((profiles ?? []) as Array<{ id: string; full_name: string }>), ...((commentProfiles ?? []) as Array<{ id: string; full_name: string }>)] .map((profile) => [profile.id, profile.full_name || "Usuário"]));
  const likeCounts = new Map<string, number>();
  const commentCounts = new Map<string, number>();
  const commentsByPost = new Map<string, CommunityComment[]>();
  for (const like of (likes ?? []) as Array<{ post_id: string }>) likeCounts.set(like.post_id, (likeCounts.get(like.post_id) ?? 0) + 1);
  for (const comment of commentRows) {
    commentCounts.set(comment.post_id, (commentCounts.get(comment.post_id) ?? 0) + 1);
    const authorName = names.get(comment.author_id) ?? "Usuário";
    const postComments = commentsByPost.get(comment.post_id) ?? [];
    postComments.push({ id: comment.id, body: comment.body, createdAt: comment.created_at, authorName, authorInitials: initials(authorName) });
    commentsByPost.set(comment.post_id, postComments);
  }

  return {
    ...community,
    memberCount: members?.length ?? 0,
    isMember: (members ?? []).some((member: { user_id: string }) => member.user_id === user.id),
    posts: rows.map((post) => {
      const authorName = names.get(post.author_id) ?? "Usuário";
      return { id: post.id, body: post.body, topic: post.topic, attachmentUrl: post.attachment_path ? supabase.storage.from("school-posts").getPublicUrl(post.attachment_path).data.publicUrl : undefined, createdAt: post.created_at, authorName, authorInitials: initials(authorName), likeCount: likeCounts.get(post.id) ?? 0, commentCount: commentCounts.get(post.id) ?? 0, comments: commentsByPost.get(post.id) ?? [] };
    }),
  };
}
