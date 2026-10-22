"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SavedItem } from "@/lib/saved";
import { removeSavedItem } from "./actions";
import styles from "@/app/styles/salvos.module.css";

function Search() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="8"/><path d="m21 21-4-4"/></svg>; }

export default function SalvosView({ items }: { items: SavedItem[] }) {
  const [query, setQuery] = useState("");
  const [collection, setCollection] = useState("Todos");
  const collections = [...new Set(items.map((item) => item.collection))];
  const filtered = useMemo(() => items.filter((item) => (collection === "Todos" || item.collection === collection) && (!query || `${item.authorName} ${item.body} ${item.collection} ${item.communityName}`.toLowerCase().includes(query.toLowerCase()))), [items, query, collection]);
  return <main className={styles.page}><section><header className={styles.header}><div><div className={styles.eyebrow}>Sua biblioteca pessoal</div><h1 className={styles.title}>Itens salvos</h1><p className={styles.subtitle}>Guarde ideias, avisos e conteúdos para consultar quando quiser.</p></div><div className={styles.search}><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar nos salvos" /></div></header><div className={styles.tabs}><button className={`${styles.tab} ${collection === "Todos" ? styles.tabActive : ""}`} onClick={() => setCollection("Todos")}>Todos</button>{collections.map((name) => <button className={`${styles.tab} ${collection === name ? styles.tabActive : ""}`} key={name} onClick={() => setCollection(name)}>{name}</button>)}<span className={styles.count}>{filtered.length} {filtered.length === 1 ? "item" : "itens"}</span></div>{filtered.length ? filtered.map((item) => <SavedCard item={item} key={item.postId} />) : <div className={styles.empty}><div className={styles.emptyIcon}>▮</div><strong>{items.length ? "Nenhum resultado encontrado" : "Sua biblioteca está vazia"}</strong><p>{items.length ? "Tente mudar a busca ou escolher outra coleção." : "Quando você salvar uma publicação, ela aparecerá aqui."}</p></div>}</section><aside className={styles.aside}><div className={styles.collectionCard}><h2 className={styles.cardTitle}>Suas coleções</h2><p className={styles.cardSubtitle}>Organize seus conteúdos por assunto.</p>{collections.length ? collections.map((name) => <button className={styles.collectionItem} key={name} onClick={() => setCollection(name)}><span className={styles.collectionIcon}>▤</span><span className={styles.collectionInfo}>{name}<small className={styles.collectionCount}>{items.filter((item) => item.collection === name).length} {items.filter((item) => item.collection === name).length === 1 ? "item" : "itens"}</small></span><span className={styles.arrow}>›</span></button>) : <p className={styles.cardSubtitle}>Suas coleções aparecerão aqui.</p>}</div><div className={styles.notice}><span className={styles.noticeIcon}>✦</span><strong>Uma biblioteca que acompanha você</strong><p>Salve uma publicação na página inicial para voltar a ela depois.</p></div></aside></main>;
}

function SavedCard({ item }: { item: SavedItem }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [removed, setRemoved] = useState(false);
  const [error, setError] = useState("");
  if (removed) return null;
  function handleRemove(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); setError(""); const formData = new FormData(event.currentTarget); startTransition(async () => { const result = await removeSavedItem(formData); if (result.ok) { setRemoved(true); router.refresh(); } else setError(result.error ?? "Não foi possível remover."); }); }
  return <article className={styles.item}><div className={styles.itemTop}><div className={styles.avatar} style={{ background: item.authorColor }}>{item.authorInitials}</div><div className={styles.itemInfo}><div className={styles.author}>{item.authorName}</div><div className={styles.meta}>{new Date(item.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}</div></div><form onSubmit={handleRemove}><input type="hidden" name="postId" value={item.postId} /><button className={styles.remove} disabled={pending} title="Remover dos salvos" aria-label="Remover dos salvos">{pending ? "…" : "▮"}</button></form></div><p className={styles.savedText}>{item.body}</p><div className={styles.itemFooter}><span className={styles.tag}>{item.collection}</span><span className={styles.community}>Em {item.communityName}</span></div>{error && <div className={styles.error}>{error}</div>}</article>;
}
