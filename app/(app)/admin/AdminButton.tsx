"use client";

import type { ReactNode } from "react";
import styles from "./admin.module.css";

// Botão de formulário que pede confirmação antes de enviar.
export default function AdminButton({
  children,
  confirmText,
  tone = "neutral",
}: {
  children: ReactNode;
  confirmText?: string;
  tone?: "neutral" | "danger" | "ok";
}) {
  const toneClass = tone === "danger" ? styles.btnDanger : tone === "ok" ? styles.btnOk : styles.btnNeutral;
  return (
    <button
      type="submit"
      className={`${styles.btn} ${toneClass}`}
      onClick={(e) => {
        if (confirmText && !window.confirm(confirmText)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
