"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "../styles/auth.module.css";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (password.length < 8) {
      setError("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não conferem.");
      return;
    }
    const { error: updateError } = await createClient().auth.updateUser({ password });
    if (updateError) {
      setError("Não foi possível atualizar a senha. Solicite um novo e-mail.");
      return;
    }
    setMessage("Senha atualizada com sucesso.");
    setDone(true);
  }

  return (
    <div className={styles.page}>
      <section className={styles.content}>
        <div className={styles.card}>
          <h2>Definir nova senha</h2>
          {done ? (
            <>
              <p className={styles.muted}>{message}</p>
              <Link href="/login" className={styles.submit}>Ir para o login</Link>
            </>
          ) : (
            <form className={styles.form} onSubmit={submit}>
              <p className={styles.muted}>Crie uma senha nova para sua conta.</p>
              <label className={styles.label}>Nova senha
                <input className={styles.input} type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" />
              </label>
              <label className={styles.label}>Confirmar senha
                <input className={styles.input} type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} autoComplete="new-password" />
              </label>
              {error && <div className={styles.error}>{error}</div>}
              <button className={styles.submit} type="submit">Salvar nova senha</button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
