import styles from "@/app/styles/loading.module.css";

export default function Loading() {
  return (
    <main className={styles.page} aria-live="polite" aria-label="Carregando">
      <div className={styles.spinner} />
      <p>Carregando seu espaço...</p>
    </main>
  );
}
