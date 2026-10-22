"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { Community } from "@/lib/communities";
import { createCommunity, joinCommunity, leaveCommunity, type CommunityCreateState } from "./actions";
import styles from "@/app/styles/comunidades.module.css";
import createStyles from "@/app/styles/comunidade-criacao.module.css";

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
    <header className={styles.header}><div><div className={styles.eyebrow}>Espaços da escola</div><h1 className={styles.title}>Comunidades</h1><p className={styles.subtitle}>Encontre grupos para conversar, colaborar e participar.</p></div><div className={createStyles.headerActions}><button className={createStyles.createButton} onClick={() => setCreateOpen((open) => !open)}>＋ {createOpen ? "Fechar" : "Criar comunidade"}</button><div className={styles.summary}><strong>{communities.length}</strong><span>comunidades<br />disponíveis</span></div></div></header>
    {createOpen && <form className={createStyles.createForm} action={createAction}><div className={createStyles.intro}><div className={createStyles.introIcon}>✦</div><div><strong>Crie seu espaço</strong><p>Uma comunidade para sua turma, projeto ou interesse.</p></div></div><div className={createStyles.field}><label htmlFor="community-name">Nome da comunidade</label><input id="community-name" name="name" maxLength={100} placeholder="Ex.: Clube de Leitura" required /></div><div className={createStyles.field}><label htmlFor="community-description">Descrição</label><textarea id="community-description" name="description" maxLength={2000} placeholder="Conte para os alunos o que acontece aqui..." /></div><div className={createStyles.createBottom}><label className={createStyles.colorPicker}>Cor do espaço <input name="color" type="color" defaultValue="#4e82b8" /></label><button className={createStyles.submitButton} type="submit">Criar comunidade →</button></div>{(state.error || state.success) && <span className={`${createStyles.message} ${state.error ? createStyles.messageError : ""}`}>{state.error ?? "Comunidade criada com sucesso."}</span>}</form>}
    {featured ? <section className={styles.featured} style={{ "--accent": featured.color } as React.CSSProperties}><div className={styles.featuredContent}><div className={styles.kicker}>DESTAQUE DA ESCOLA</div><h2>{featured.name}</h2><p>{featured.description}</p><span className={styles.featuredMeta}>{featured.memberCount} participantes</span><div className={styles.featuredActions}><Link className={styles.featuredLink} href={`/comunidades/${featured.slug}`}>Abrir comunidade</Link><MembershipButton community={featured} /></div></div><div className={styles.featuredOrb} /></section> : <div className={styles.empty}><strong>Nenhuma comunidade disponível</strong><p>Quando houver grupos, eles aparecerão aqui.</p></div>}
    {others.length > 0 && <section><div className={styles.sectionHeader}><div><h2>Todos os grupos</h2><p>Participe das conversas que combinam com você.</p></div><span>{others.length} opções</span></div><div className={styles.grid}>{others.map((community) => <article className={styles.card} key={community.id}><div className={styles.cardTop}><div className={styles.icon} style={{ background: community.color }}>{community.name.slice(0, 2).toUpperCase()}</div><span className={styles.visibility}>{community.visibility === "school" ? "Toda a escola" : "Privada"}</span></div><Link className={styles.cardLink} href={`/comunidades/${community.slug}`}><h3>{community.name}</h3></Link><p>{community.description}</p><div className={styles.cardFooter}><span>{community.memberCount} participantes</span><MembershipButton community={community} /></div></article>)}</div></section>}
  </main>;
}
