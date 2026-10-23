"use client";

import { useEffect, useState } from "react";
import styles from "./seguranca.module.css";

const ITENS = [
  { id: "unica", titulo: "Uma senha diferente para cada conta", dica: "Se uma vazar, as outras continuam seguras." },
  { id: "longa", titulo: "Senhas longas (12+ caracteres) ou frases", dica: "Quatro palavras aleatórias valem mais que P@ssw0rd!" },
  { id: "gerenciador", titulo: "Usar um gerenciador de senhas", dica: "Ele cria e guarda senhas fortes pra você." },
  { id: "doisfatores", titulo: "Ativar a verificação em duas etapas", dica: "Mesmo com a senha roubada, o golpista não entra." },
  { id: "codigos", titulo: "Nunca passar códigos recebidos por SMS", dica: "Código é a chave da sua conta. Ninguém sério pede isso." },
  { id: "links", titulo: "Conferir remetente e link antes de clicar", dica: "Segure o toque (ou passe o mouse) no link pra ver o destino real." },
  { id: "atualizacoes", titulo: "Manter celular, apps e navegador atualizados", dica: "Atualizações corrigem falhas que golpistas exploram." },
  { id: "wifi", titulo: "Evitar Wi-Fi público para contas e bancos", dica: "Redes abertas podem ser observadas por outras pessoas." },
  { id: "privacidade", titulo: "Não postar documentos, endereço ou boletos", dica: "Dados expostos alimentam golpes feitos sob medida." },
  { id: "vitima", titulo: "Saber o que fazer se cair num golpe", dica: "Troque as senhas, avise o banco e a escola e registre um boletim de ocorrência." },
];

const CHAVE = "nexo-seguranca-checklist";

export default function SecurityChecklist() {
  const [feitos, setFeitos] = useState<string[]>([]);
  const [carregado, setCarregado] = useState(false);

  // Carrega o progresso salvo neste navegador.
  useEffect(() => {
    try {
      const salvo = localStorage.getItem(CHAVE);
      if (salvo) window.setTimeout(() => setFeitos(JSON.parse(salvo)), 0);
    } catch {
      /* sem armazenamento disponível: segue sem salvar */
    }
    window.setTimeout(() => setCarregado(true), 0);
  }, []);

  function atualizar(novos: string[]) {
    setFeitos(novos);
    try {
      localStorage.setItem(CHAVE, JSON.stringify(novos));
    } catch {
      /* ignora */
    }
  }

  function alternar(id: string) {
    atualizar(feitos.includes(id) ? feitos.filter((f) => f !== id) : [...feitos, id]);
  }

  const pct = Math.round((feitos.length / ITENS.length) * 100);

  return (
    <section className={styles.card}>
      <div className={styles.clHead}>
        <div>
          <div className={styles.cardTitle}>Checklist de boas práticas</div>
          <div className={styles.cardSub}>
            Marque o que você já faz. {carregado ? `${feitos.length} de ${ITENS.length} concluídos.` : ""}
          </div>
        </div>
        <button className={styles.btnGhost} onClick={() => atualizar([])} disabled={!feitos.length}>
          Limpar
        </button>
      </div>

      <div className={styles.progress} style={{ marginBottom: 0 }}>
        <div className={styles.progressBar} style={{ width: `${pct}%`, background: "#1a7f4b" }} />
      </div>

      <div className={styles.clList}>
        {ITENS.map((item) => {
          const feito = feitos.includes(item.id);
          return (
            <button
              key={item.id}
              className={`${styles.clItem} ${feito ? styles.clItemDone : ""}`}
              onClick={() => alternar(item.id)}
              aria-pressed={feito}
            >
              <span className={`${styles.clBox} ${feito ? styles.clBoxDone : ""}`}>{feito ? "✓" : ""}</span>
              <span>
                <strong>{item.titulo}</strong>
                <small>{item.dica}</small>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
