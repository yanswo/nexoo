import Link from "next/link";
import styles from "./seguranca.module.css";
import ProtecaoNexo from "./ProtecaoNexo";
import PhishingQuiz from "./PhishingQuiz";
import PasswordTester from "./PasswordTester";
import SecurityChecklist from "./SecurityChecklist";

// Tela completa de Segurança. Cada seção também pode ser importada separada,
// por exemplo: import PhishingQuiz from "@/app/components/seguranca/PhishingQuiz";
export default function SegurancaView() {
  return (
    <div className={styles.root}>
      <header>
        <div className={styles.eyebrow}>Segurança de dados</div>
        <h1 className={styles.title}>Proteja seus dados</h1>
        <p className={styles.subtitle}>
          Aprenda a reconhecer golpes, teste suas senhas e confira boas práticas para se proteger
          na internet.
        </p>
      </header>

      <Link href="/quiz" className={styles.challenge}>
        <span>
          <strong>Desafio Nexo valendo bombons</strong>
          <small>Responda rápido, acumule pontos e suba no ranking.</small>
        </span>
        <span className={styles.challengeBtn}>Jogar agora</span>
      </Link>

      <ProtecaoNexo />

      <div className={styles.twoCols}>
        <PhishingQuiz />
        <PasswordTester />
      </div>

      <SecurityChecklist />
    </div>
  );
}
