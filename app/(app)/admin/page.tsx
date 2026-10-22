import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import AdminButton from "./AdminButton";
import AutoRefresh from "./AutoRefresh";
import { banUser, deletePost, setAdmin, unbanUser } from "./actions";
import styles from "./admin.module.css";

type PostRow = { id: string; body: string; created_at: string; author_id: string };
type ProfileRow = {
  id: string;
  full_name: string;
  role: string;
  banned_at: string | null;
  created_at: string;
};

function formatDate(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminPage() {
  const me = await getCurrentUser();
  if (!me.isAdmin) redirect("/inicio");

  const supabase = await createClient();
  const [{ data: postData }, { data: profileData }] = await Promise.all([
    supabase
      .from("posts")
      .select("id, body, created_at, author_id")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("profiles")
      .select("id, full_name, role, banned_at, created_at")
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  const posts = (postData ?? []) as PostRow[];
  const profiles = (profileData ?? []) as ProfileRow[];
  const byId = new Map(profiles.map((p) => [p.id, p]));
  const nameOf = (id: string) => byId.get(id)?.full_name?.trim() || "Sem nome";

  return (
    <div className={styles.page}>
      <AutoRefresh seconds={8} />
      <header>
        <div className={styles.eyebrow}>Administração</div>
        <h1 className={styles.title}>Moderação</h1>
        <p className={styles.subtitle}>
          Remova publicações e suspenda contas. Esta página atualiza sozinha a cada poucos segundos.
        </p>
      </header>

      <section className={styles.card}>
        <div className={styles.cardTitle}>Publicações recentes ({posts.length})</div>
        {posts.length === 0 && <div className={styles.empty}>Nenhuma publicação por enquanto.</div>}
        <div className={styles.list}>
          {posts.map((post) => {
            const author = byId.get(post.author_id);
            return (
              <div className={styles.row} key={post.id}>
                <div className={styles.rowMain}>
                  <div className={styles.rowMeta}>
                    <b>{nameOf(post.author_id)}</b>
                    {author?.banned_at && <span className={styles.tagBan}>banido</span>}
                    <span>· {formatDate(post.created_at)}</span>
                  </div>
                  <div className={styles.postBody}>{post.body}</div>
                </div>
                <div className={styles.rowActions}>
                  <form action={deletePost}>
                    <input type="hidden" name="postId" value={post.id} />
                    <AdminButton tone="danger" confirmText="Remover esta publicação?">
                      Remover
                    </AdminButton>
                  </form>
                  {author && !author.banned_at && author.role !== "admin" && (
                    <form action={banUser}>
                      <input type="hidden" name="userId" value={author.id} />
                      <AdminButton
                        tone="danger"
                        confirmText={`Banir ${nameOf(author.id)} e apagar tudo que a pessoa publicou?`}
                      >
                        Banir autor
                      </AdminButton>
                    </form>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.cardTitle}>Usuários ({profiles.length})</div>
        <div className={styles.list}>
          {profiles.map((p) => {
            const isMe = p.id === me.id;
            const isAdmin = p.role === "admin";
            return (
              <div className={styles.row} key={p.id}>
                <div className={styles.rowMain}>
                  <div className={styles.rowMeta}>
                    <b>{p.full_name?.trim() || "Sem nome"}</b>
                    {isAdmin && <span className={styles.tagAdmin}>admin</span>}
                    {p.banned_at && <span className={styles.tagBan}>banido</span>}
                    {isMe && <span className={styles.tagMe}>você</span>}
                    <span>· entrou em {formatDate(p.created_at)}</span>
                  </div>
                </div>
                {!isMe && (
                  <div className={styles.rowActions}>
                    {p.banned_at ? (
                      <form action={unbanUser}>
                        <input type="hidden" name="userId" value={p.id} />
                        <AdminButton tone="ok">Reativar</AdminButton>
                      </form>
                    ) : (
                      !isAdmin && (
                        <form action={banUser}>
                          <input type="hidden" name="userId" value={p.id} />
                          <AdminButton
                            tone="danger"
                            confirmText={`Banir ${p.full_name || "este usuário"} e apagar tudo que a pessoa publicou?`}
                          >
                            Banir
                          </AdminButton>
                        </form>
                      )
                    )}
                    {!p.banned_at && (
                      <form action={setAdmin}>
                        <input type="hidden" name="userId" value={p.id} />
                        <input type="hidden" name="makeAdmin" value={isAdmin ? "false" : "true"} />
                        <AdminButton
                          confirmText={
                            isAdmin
                              ? `Tirar a permissão de admin de ${p.full_name || "este usuário"}?`
                              : `Dar permissão de admin a ${p.full_name || "este usuário"}?`
                          }
                        >
                          {isAdmin ? "Tirar admin" : "Tornar admin"}
                        </AdminButton>
                      </form>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
