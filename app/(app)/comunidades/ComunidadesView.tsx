"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { Community } from "@/lib/communities";
import { createCommunity, joinCommunity, leaveCommunity, type CommunityCreateState } from "./actions";
import styles from "@/app/styles/comunidades.module.css";

function MembershipButton({ community }: { community: Community }) {
  if (community.isMember) return <form action={leaveCommunity}><input type="hidden" name="communityId" value={community.id} /><button className={styles.leaveButton}>Sair</button></form>;
  return <form action={joinCommunity}><input type="hidden" name="communityId" value={community.id} /><button className={styles.joinButton}>Participar</button></form>;
}

export default function ComunidadesView({ communities }: { communities: Community[] }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [state, createAction] = useActionState<CommunityCreateState, FormData>(createCommunity, {});
  const featured = communities[0];
  const others = communities.slice(1);
  return <main className={styles.page}>
    <header className={styles.header}><div><div className={styles.eyebrow}>Espaços da escola</div><h1 className={styles.title}>Comunidades</h1><p className={styles.subtitle}>Encontre grupos para conversar, colaborar e participar.</p></div><div style={{ display: "flex", alignItems: "center", gap: 12 }}><button style={{ border: "1px solid #dbe3ea", background: "#fff", color: "#102541", borderRadius: 9, padding: "10px 12px", fontSize: 10, fontWeight: 700, cursor: "pointer" }} onClick={() => setCreateOpen((open) => !open)}>＋ Criar comunidade</button><div className={styles.summary}><strong>{communities.length}</strong><span>comunidades<br />disponíveis</span></div></div></header>
    {createOpen && <form style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, background: "#fff", border: "1px solid #e4e9ef", borderRadius: 14, padding: 18, margin: "-10px 0 28px" }} action={createAction}><div style={{ gridColumn: "1 / -1" }}><strong>Nova comunidade</strong><p style={{ fontSize: 11, color: "#8191a3", marginTop: 5 }}>Crie um espaço para sua turma ou interesse. Cada aluno pode ter uma comunidade.</p></div><input style={{ width: "100%", border: "1px solid #dbe3ea", borderRadius: 8, padding: 10, fontSize: 11 }} name="name" maxLength={100} placeholder="Nome da comunidade" required /><textarea style={{ width: "100%", border: "1px solid #dbe3ea", borderRadius: 8, padding: 10, fontSize: 11 }} name="description" maxLength={2000} placeholder="Sobre o que será esse espaço?" /><div style={{ display: "flex", alignItems: "center", gap: 10 }}><input name="color" type="color" defaultValue="#4e82b8" /><button className={styles.joinButton} type="submit">Criar</button></div>{(state.error || state.success) && <span style={{ gridColumn: "1 / -1", fontSize: 10, color: "#61768c" }}>{state.error ?? "Comunidade criada."}</span>}</form>}
    {featured ? <section className={styles.featured} style={{ "--accent": featured.color } as React.CSSProperties}><div className={styles.featuredContent}><div className={styles.kicker}>DESTAQUE DA ESCOLA</div><h2>{featured.name}</h2><p>{featured.description}</p><span className={styles.featuredMeta}>{featured.memberCount} participantes</span><div className={styles.featuredActions}><Link className={styles.featuredLink} href={`/comunidades/${featured.slug}`}>Abrir comunidade</Link><MembershipButton community={featured} /></div></div><div className={styles.featuredOrb} /></section> : <div className={styles.empty}><strong>Nenhuma comunidade disponível</strong><p>Quando houver grupos, eles aparecerão aqui.</p></div>}
    {others.length > 0 && <section><div className={styles.sectionHeader}><div><h2>Todos os grupos</h2><p>Participe das conversas que combinam com você.</p></div><span>{others.length} opções</span></div><div className={styles.grid}>{others.map((community) => <article className={styles.card} key={community.id}><div className={styles.cardTop}><div className={styles.icon} style={{ background: community.color }}>{community.name.slice(0, 2).toUpperCase()}</div><span className={styles.visibility}>{community.visibility === "school" ? "Toda a escola" : "Privada"}</span></div><Link className={styles.cardLink} href={`/comunidades/${community.slug}`}><h3>{community.name}</h3></Link><p>{community.description}</p><div className={styles.cardFooter}><span>{community.memberCount} participantes</span><MembershipButton community={community} /></div></article>)}</div></section>}
  </main>;
}
