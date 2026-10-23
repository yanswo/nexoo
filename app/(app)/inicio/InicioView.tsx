"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { useUser } from "../../components/UserProvider";
import type { CommunityNotification, HomeEvent, HomePost } from "../../../lib/home";
import { createClient } from "../../../lib/supabase/client";
import { deletePost } from "../admin/actions";
import { createComment, toggleLike } from "@/app/actions/posts";
import { publishPost, removeSavedPost, savePost, type PublishState } from "./actions";
import styles from "@/app/styles/inicio.module.css";
import commentStyles from "@/app/styles/comments.module.css";
import interactionStyles from "@/app/styles/inicio-interactions.module.css";
import notificationStyles from "@/app/styles/notifications.module.css";

function formatEvent(event: HomeEvent) {
  const date = new Date(event.startsAt);
  return { day: date.toLocaleDateString("pt-BR", { day: "2-digit" }), month: date.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "").toUpperCase(), time: date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) };
}

function formatRole(role: string) { return role === "teacher" ? "Professor" : role === "staff" ? "Equipe escolar" : "Aluno"; }
function formatToday() { return new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" }); }
function formatRelative(value: string) { const minutes = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 60000)); if (minutes < 60) return `há ${minutes} min`; const hours = Math.floor(minutes / 60); if (hours < 24) return `há ${hours} h`; return `há ${Math.floor(hours / 24)} d`; }

function PublishButton() { const { pending } = useFormStatus(); return <button className={styles.publishButton} type="submit" disabled={pending}><Send />{pending ? "Publicando..." : "Publicar"}</button>; }

export default function InicioView({ posts, recommendedPosts, events, notifications }: { posts: HomePost[]; recommendedPosts: HomePost[]; events: HomeEvent[]; notifications: CommunityNotification[] }) {
  const user = useUser();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [state, action] = useActionState<PublishState, FormData>(publishPost, null);
  useEffect(() => { const supabase = createClient(); const channel = supabase.channel("home-live").on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => router.refresh()).on("postgres_changes", { event: "*", schema: "public", table: "post_likes" }, () => router.refresh()).on("postgres_changes", { event: "*", schema: "public", table: "comments" }, () => router.refresh()).on("postgres_changes", { event: "*", schema: "public", table: "saved_items" }, () => router.refresh()).subscribe(); return () => { void supabase.removeChannel(channel); }; }, [router]);
  const term = search.trim().toLowerCase();
  const matches = (post: HomePost) => !term || `${post.body} ${post.authorName} ${post.topic}`.toLowerCase().includes(term);
  const visiblePosts = posts.filter(matches);
  const visibleRecommendations = recommendedPosts.filter(matches);
  return <main className={styles.page}>
    <section className={styles.content}>
      <header className={styles.header}><div><span className={styles.eyebrow}>{formatToday()}</span><h1>Bom dia, <em>{user.firstName}</em></h1><p>Veja o que está acontecendo na sua comunidade escolar.</p></div><div className={styles.headerActions}><label className={styles.search}><Search /><input className={interactionStyles.searchInput} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar na escola" aria-label="Buscar na escola" /><kbd>⌘ K</kbd></label><div className={notificationStyles.wrap}><button className={notificationStyles.button} aria-label="Notificações" onClick={() => setNotificationsOpen((open) => !open)}><Bell />{notifications.length > 0 && <i className={notificationStyles.dot} />}</button>{notificationsOpen && <div className={notificationStyles.panel}><div className={notificationStyles.heading}><strong>Mensagens das suas comunidades</strong><span>{notifications.length} recentes</span></div>{notifications.length ? notifications.map((notification) => <div className={notificationStyles.item} key={notification.id}><div className={notificationStyles.icon} style={{ background: notification.communityColor }}>{notification.communityName.slice(0, 2).toUpperCase()}</div><div><strong>{notification.title}</strong><p>{notification.text}</p><time>{formatRelative(notification.createdAt)}</time></div></div>) : <p className={notificationStyles.empty}>Você ainda não tem novas mensagens nas comunidades.</p>}</div>}</div></div></header>
      <div className={styles.stats}><div><strong>{posts.length}</strong><span>atualizações recentes</span></div><div><strong>{events.length}</strong><span>próximos eventos</span></div><div><strong>∞</strong><span>possibilidades de aprender</span></div></div>
      <section className={styles.composer}><div className={styles.composerHeading}><div className={styles.avatar} style={{ background: "#ef6f58" }}>{user.initials}</div><div><strong>Compartilhe com a escola</strong><span>O que você gostaria de contar hoje?</span></div></div><form action={action} encType="multipart/form-data"><textarea name="body" rows={3} maxLength={5000} placeholder="Uma ideia, dúvida ou conquista..." /><div className={styles.composerFooter}><div className={styles.composerHint}><span>Visível para a comunidade escolar</span><label className={styles.topicSelect}>Tema <select name="topic" defaultValue="Geral"><option>Geral</option><option>Matemática</option><option>História</option><option>Ciências</option><option>Tecnologia</option><option>Robótica</option><option>Artes</option><option>Esportes</option><option>Avisos</option></select></label><label className={styles.uploadButton}><ImageIcon /> Imagem<input type="file" name="attachment" accept="image/jpeg,image/png,image/webp,image/gif" /></label></div><PublishButton /></div>{state?.error && <div className={styles.error}>{state.error}</div>}{state?.success && <div className={styles.success}>Publicação enviada para a comunidade.</div>}</form></section>
      {visibleRecommendations.length > 0 && <section className={styles.recommendations}><div className={styles.recommendationHeading}><div><span className={styles.eyebrow}>Personalizado para você</span><h2>Para você</h2><p>Conteúdos escolhidos a partir das suas interações.</p></div><span className={styles.spark}>✦</span></div><div className={styles.recommendationGrid}>{visibleRecommendations.map((post) => <PostCard key={`recommended-${post.id}`} post={post} recommended />)}</div></section>}
      <div className={styles.feedHeading}><div><span className={styles.eyebrow}>Mural da escola</span><h2>{term ? "Resultados da busca" : "Atualizações recentes"}</h2></div><span>{visiblePosts.length ? `${visiblePosts.length} publicações` : "Nenhum resultado"}</span></div>
      {visiblePosts.length ? visiblePosts.map((post) => <PostCard key={post.id} post={post} />) : <div className={styles.empty}><div>{term ? "⌕" : "✦"}</div><strong>{term ? "Nenhuma publicação encontrada" : "O mural está esperando por você"}</strong><p>{term ? "Tente buscar por outro assunto, autor ou tema." : "Seja a primeira pessoa a compartilhar uma ideia, dúvida ou conquista."}</p></div>}
    </section>
    <aside className={styles.aside}><div className={styles.asideIntro}><span className={styles.eyebrow}>Sua escola</span><strong>Um espaço para<br /><em>estar por perto.</em></strong><p>Conecte-se às pessoas, projetos e momentos que fazem parte da sua rotina.</p></div><section className={styles.eventsCard}><div className={styles.cardHeading}><div><span className={styles.eyebrow}>Agenda</span><h2>Próximos eventos</h2></div><a href="/agenda">Ver agenda <span>→</span></a></div>{events.length ? events.slice(0, 4).map((event) => { const date = formatEvent(event); return <div className={styles.event} key={event.id}><div className={styles.eventDate}><strong>{date.day}</strong><span>{date.month}</span></div><div><strong>{event.title}</strong><span>{date.time} · {event.location}</span></div></div>; }) : <p className={styles.noEvents}>Nenhum evento próximo.</p>}</section><div className={styles.tip}><span className={styles.tipIcon}>✦</span><div><strong>Uma dica para hoje</strong><p>Pequenas interações também constroem grandes comunidades.</p></div></div></aside>
  </main>;
}

function PostCard({ post, recommended = false }: { post: HomePost; recommended?: boolean }) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const user = useUser();
  const canDelete = user.isAdmin || post.authorId === user.id;
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    function closeMenu(event: MouseEvent) { if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false); }
    function closeOnEscape(event: KeyboardEvent) { if (event.key === "Escape") setMenuOpen(false); }
    document.addEventListener("mousedown", closeMenu);
    document.addEventListener("keydown", closeOnEscape);
    return () => { document.removeEventListener("mousedown", closeMenu); document.removeEventListener("keydown", closeOnEscape); };
  }, [menuOpen]);
  useEffect(() => {
    const forms = [...document.querySelectorAll(`form input[name="postId"][value="${post.id}"]`)].map((input) => input.closest("form"));
    forms[0]?.querySelector("button")?.classList.toggle(styles.liked, post.isLiked);
  }, [post.id, post.isLiked]);
  if (hidden) return null;
  function copyPost() { void navigator.clipboard?.writeText(post.body); setMenuOpen(false); }
  return <article className={`${styles.post} ${recommended ? styles.recommendedPost : ""}`}>{recommended && <div className={styles.reason}><span>✦</span>{post.recommendationReason ?? "Recomendado para você"}</div>}<div className={styles.postHeader}><div className={styles.postUser}><div className={styles.postAvatar}>{post.authorInitials}</div><div><strong>{post.authorName}</strong><span>{formatRole(post.authorRole)} <b>·</b> {formatRelative(post.createdAt)}</span></div></div><div ref={menuRef} className={interactionStyles.menuWrap}><button className={styles.more} aria-label="Mais opções" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>•••</button>{menuOpen && <div className={interactionStyles.postMenu}><button onClick={copyPost}>Copiar conteúdo</button>{post.isSaved ? <form action={removeSavedPost}><input type="hidden" name="postId" value={post.id} /><button type="submit">Remover dos salvos</button></form> : <form action={savePost}><input type="hidden" name="postId" value={post.id} /><button type="submit">Salvar publicação</button></form>}<button onClick={() => { setHidden(true); setMenuOpen(false); }}>Ocultar publicação</button>{canDelete && <form action={deletePost}><input type="hidden" name="postId" value={post.id} /><button type="submit" onClick={(event) => { if (!window.confirm("Remover esta publicação?")) event.preventDefault(); }}>{user.isAdmin ? "Remover publicação" : "Excluir publicação"}</button></form>}</div>}</div></div><div className={styles.topicBadge}>{post.topic}</div><p className={styles.postText}>{post.body}</p>{post.attachmentUrl && <img className={styles.postImage} src={post.attachmentUrl} alt="Imagem anexada à publicação" />}<div className={styles.postFooter}><form action={toggleLike}><input type="hidden" name="postId" value={post.id} /><input type="hidden" name="redirectPath" value="/inicio" /><button type="submit"><Heart />{post.likeCount || "Curtir"}</button></form><button type="button" onClick={() => setCommentsOpen((open) => !open)}><Comment />{post.commentCount || "Comentar"}</button>{post.isSaved ? <form className={styles.saveForm} action={removeSavedPost}><input type="hidden" name="postId" value={post.id} /><button type="submit" className={styles.saved}><Bookmark />Salvo</button></form> : <form className={styles.saveForm} action={savePost}><input type="hidden" name="postId" value={post.id} /><button type="submit"><Bookmark />Salvar</button></form>}</div>{commentsOpen && <div className={commentStyles.thread}>{post.comments.length ? post.comments.map((comment) => <div className={commentStyles.comment} key={comment.id}><div className={commentStyles.avatar}>{comment.authorInitials}</div><div><strong>{comment.authorName}</strong><span>{formatRelative(comment.createdAt)}</span><p>{comment.body}</p></div></div>) : <p className={commentStyles.noComments}>Ainda não há comentários. Seja o primeiro a comentar.</p>}<form className={commentStyles.form} action={createComment}><input type="hidden" name="postId" value={post.id} /><input type="hidden" name="redirectPath" value="/inicio" /><input name="body" maxLength={2000} placeholder="Escreva um comentário..." required /><button type="submit">Enviar</button></form></div>}</article>;
}

function Search() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="8" /><path d="m21 21-4-4" /></svg>; }
function Bell() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10 21h4" /></svg>; }
function Heart() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20.8 8.8c0 5.5-8.8 10.2-8.8 10.2S3.2 14.3 3.2 8.8A4.8 4.8 0 0 1 12 6.3a4.8 4.8 0 0 1 8.8 2.5Z" /></svg>; }
function Comment() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 11.5a7.5 7.5 0 0 1-8 7.5 8.3 8.3 0 0 1-3.4-.7L4 20l1.4-3.7A7.4 7.4 0 0 1 4 11.5 7.5 7.5 0 0 1 12 4a7.5 7.5 0 0 1 8 7.5Z" /></svg>; }
function Bookmark() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>; }
function ImageIcon() { return <span>▧</span>; }
function Send() { return <span>↗</span>; }
