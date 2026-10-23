"use client";

import { useActionState } from "react";
import type { ProfileData } from "@/lib/profile";
import { updateProfile, type ProfileState } from "./actions";
import styles from "@/app/styles/perfil.module.css";

function initials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts.at(-1)?.[0] ?? "")).toUpperCase();
}

export default function ProfileView({ profile }: { profile: ProfileData }) {
  const [state, action] = useActionState<ProfileState, FormData>(updateProfile, null);
  const maxInterestScore = profile.interests[0]?.score ?? 1;

  return (
    <main className={styles.page}>
      <div className={styles.back}>Seu espaço pessoal</div>
      <header className={styles.hero}>
        <div className={styles.heroAvatar}>
          {profile.avatarUrl ? <img src={profile.avatarUrl} alt={`Foto de ${profile.fullName}`} /> : initials(profile.fullName)}
        </div>
        <div><span className={styles.eyebrow}>Perfil do aluno</span><h1>{profile.fullName}</h1><p>{profile.email}</p></div>
        <span className={styles.role}>{profile.role === "student" ? "Aluno" : profile.role}</span>
      </header>

      <section className={styles.card}>
        <div className={styles.cardHeader}><div><h2>Sobre você</h2><p>Essas informações aparecem no seu perfil e nas suas publicações.</p></div></div>
        <form action={action} encType="multipart/form-data">
          <div className={styles.grid}>
            <label>Nome completo<input name="name" defaultValue={profile.fullName} maxLength={100} required /></label>
            <label>Foto de perfil<input name="avatar" type="file" accept="image/jpeg,image/png,image/webp" /><small>JPG, PNG ou WEBP · máximo 2 MB</small></label>
          </div>
          <label>Bio<textarea name="bio" defaultValue={profile.bio} maxLength={240} placeholder="Conte um pouco sobre você..." /></label>
          <div className={styles.footer}><span>{state?.error ?? (state?.success ? "Perfil atualizado com sucesso." : "")}</span><button type="submit">Salvar alterações</button></div>
        </form>
      </section>

      <section className={styles.card}>
        <div className={styles.cardHeader}><div><h2>Seus interesses</h2><p>O algoritmo entende suas preferências a partir das suas interações.</p></div></div>
        {profile.interests.length ? (
          <div className={styles.interestList}>
            {profile.interests.map((interest, index) => (
              <div className={styles.interestItem} key={interest.topic}>
                <div className={styles.interestTop}><span className={styles.interestRank}>{index + 1}</span><strong>{interest.topic}</strong><span>{interest.interactions} {interest.interactions === 1 ? "interação" : "interações"}</span></div>
                <div className={styles.interestTrack}><i style={{ width: `${Math.max(18, Math.round((interest.score / maxInterestScore) * 100))}%` }} /></div>
              </div>
            ))}
          </div>
        ) : <div className={styles.interestEmpty}>Interaja com publicações para descobrir seus principais interesses.</div>}
      </section>

      <section className={styles.card}>
        <div className={styles.cardHeader}><div><h2>Como você participa</h2><p>Seu perfil ajuda a personalizar o conteúdo do Nexo.</p></div></div>
        <div className={styles.infoGrid}><div><strong>Comunidades</strong><span>Seus espaços de interesse</span></div><div><strong>Interesses</strong><span>Temas que você acompanha</span></div><div><strong>Publicações</strong><span>Ideias compartilhadas</span></div></div>
      </section>
    </main>
  );
}
