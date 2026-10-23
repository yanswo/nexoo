"use client";

import { useState, useTransition } from "react";
import type { ResetPasswordResult } from "./actions";
import styles from "./admin.module.css";

type ResetAction = (formData: FormData) => Promise<ResetPasswordResult>;

export default function ResetPasswordButton({ userId, action }: { userId: string; action: ResetAction }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("Alunos@123");
  const [result, setResult] = useState<ResetPasswordResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => setResult(await action(formData)));
  }

  function close() {
    setOpen(false);
    setResult(null);
    setPassword("Alunos@123");
  }

  return (
    <>
      <button type="button" className={styles.btn} onClick={() => setOpen(true)}>Resetar senha</button>
      {open && (
        <div className={styles.modalBackdrop} role="presentation" onMouseDown={close}>
          <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby={`reset-title-${userId}`} onMouseDown={(event) => event.stopPropagation()}>
            <div className={styles.cardTitle} id={`reset-title-${userId}`}>Redefinir senha</div>
            {result?.ok ? (
              <div className={styles.resetSuccess}>
                <p>{result.message}</p>
                <strong>A nova senha é: {result.password}</strong>
                <button type="button" className={`${styles.btn} ${styles.btnNeutral}`} onClick={close}>Fechar</button>
              </div>
            ) : (
              <form onSubmit={submit} className={styles.resetForm}>
                <input type="hidden" name="userId" value={userId} />
                <label className={styles.resetLabel} htmlFor={`password-${userId}`}>Nova senha</label>
                <input id={`password-${userId}`} className={styles.resetInput} name="password" type="text" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required autoComplete="new-password" autoFocus />
                {result && <div className={styles.resetError}>{result.message}</div>}
                <div className={styles.modalActions}>
                  <button type="submit" className={`${styles.btn} ${styles.btnOk}`} disabled={isPending}>{isPending ? "Redefinindo..." : "Redefinir senha"}</button>
                  <button type="button" className={styles.resetCancel} onClick={close}>Cancelar</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
