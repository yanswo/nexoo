"use client";

import { useState } from "react";
import styles from "./seguranca.module.css";

// Tudo aqui roda no seu navegador. A senha NÃO é enviada para lugar nenhum.
// Só na verificação opcional de vazamento saem os 5 primeiros caracteres de um hash (k-anonymity).

const COMUNS = [
  "123456", "12345678", "123456789", "1234567890", "123123", "654321", "111111", "000000",
  "1234", "12345", "password", "senha", "senha123", "senha1234", "qwerty", "qwerty123",
  "abc123", "admin", "letmein", "iloveyou", "brasil", "flamengo", "corinthians", "mudar123",
  "amor", "teamo", "minhasenha", "escola", "estudante",
];

const SEQUENCIAS = ["0123456789", "abcdefghijklmnopqrstuvwxyz", "qwertyuiop", "asdfghjkl", "zxcvbnm"];

function temSequencia(pw: string) {
  const p = pw.toLowerCase();
  if (/(.)\1{2,}/.test(p)) return true;
  if (/(.{2,})\1/.test(p)) return true;
  for (const seq of SEQUENCIAS) {
    for (let i = 0; i + 4 <= seq.length; i++) {
      const trecho = seq.slice(i, i + 4);
      if (p.includes(trecho) || p.includes(trecho.split("").reverse().join(""))) return true;
    }
  }
  return false;
}

function formatarTempo(seg: number): string {
  if (seg < 1) return "menos de 1 segundo";
  if (seg < 60) return `${Math.round(seg)} segundos`;
  const min = seg / 60;
  if (min < 60) return `${Math.round(min)} minutos`;
  const h = min / 60;
  if (h < 24) return `${Math.round(h)} horas`;
  const d = h / 24;
  if (d < 365) return `${Math.round(d)} dias`;
  const a = d / 365;
  if (a < 1000) return `${Math.round(a).toLocaleString("pt-BR")} anos`;
  if (a < 1_000_000) return `${Math.round(a / 1000).toLocaleString("pt-BR")} mil anos`;
  return "mais de 1 milhão de anos";
}

const NIVEIS = [
  { nome: "Muito fraca", cor: "#b42318" },
  { nome: "Fraca", cor: "#e0562f" },
  { nome: "Razoável", cor: "#c89d3c" },
  { nome: "Forte", cor: "#1a7f4b" },
  { nome: "Muito forte", cor: "#0f5c37" },
];

function analisar(pw: string) {
  const tem = {
    min: /[a-z]/.test(pw),
    mai: /[A-Z]/.test(pw),
    num: /\d/.test(pw),
    sim: /[^A-Za-z0-9]/.test(pw),
  };
  const comum = COMUNS.includes(pw.toLowerCase());
  const sequencia = temSequencia(pw);

  const charset = (tem.min ? 26 : 0) + (tem.mai ? 26 : 0) + (tem.num ? 10 : 0) + (tem.sim ? 33 : 0);
  let bits = pw.length * Math.log2(Math.max(charset, 1));
  // Length alone must not make a predictable run look strong.
  if (sequencia) bits = Math.min(bits * 0.6, 20);
  if (comum) bits = Math.min(bits, 8);

  // Estimativa para um ataque offline rápido (10 bilhões de tentativas por segundo), em média metade do caminho.
  const segundos = Math.pow(2, bits) / 1e10 / 2;
  const nivel = bits < 28 ? 0 : bits < 45 ? 1 : bits < 60 ? 2 : bits < 80 ? 3 : 4;

  const criterios = [
    { ok: pw.length >= 12, texto: "Pelo menos 12 caracteres" },
    { ok: tem.min && tem.mai, texto: "Letras maiúsculas e minúsculas" },
    { ok: tem.num, texto: "Números" },
    { ok: tem.sim, texto: "Símbolos (! @ # ? -)" },
    { ok: !comum, texto: "Não é uma senha comum" },
    { ok: !sequencia, texto: "Sem sequências (1234, abcd) ou repetições (aaa)" },
  ];

  return { nivel, segundos, criterios };
}

async function contarVazamentos(pw: string): Promise<number | null> {
  try {
    const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(pw));
    const hex = Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
    const prefixo = hex.slice(0, 5);
    const sufixo = hex.slice(5);
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefixo}`, {
      headers: { "Add-Padding": "true" },
    });
    if (!res.ok) return null;
    const texto = await res.text();
    for (const linha of texto.split("\n")) {
      const [s, n] = linha.trim().split(":");
      if (s === sufixo) return Number(n);
    }
    return 0;
  } catch {
    return null;
  }
}

type Vazamento = { senha: string; estado: "carregando" | "pronto" | "erro"; vezes?: number };

export default function PasswordTester() {
  const [senha, setSenha] = useState("");
  const [mostrar, setMostrar] = useState(false);
  const [vazamento, setVazamento] = useState<Vazamento | null>(null);

  const r = senha ? analisar(senha) : null;
  const nivel = r ? NIVEIS[r.nivel] : null;
  // Só mostra o resultado do vazamento se ele foi checado para a senha que está na caixa agora.
  const vaz = vazamento && vazamento.senha === senha ? vazamento : null;

  async function verificar() {
    const atual = senha;
    setVazamento({ senha: atual, estado: "carregando" });
    const vezes = await contarVazamentos(atual);
    setVazamento(
      vezes === null ? { senha: atual, estado: "erro" } : { senha: atual, estado: "pronto", vezes }
    );
  }

  return (
    <section className={styles.card}>
      <div className={styles.cardHead}>
        <div className={styles.cardTitle}>Testador de senhas</div>
        <div className={styles.cardSub}>
          Digite uma senha e veja se ela é boa. A análise acontece no seu navegador.
        </div>
      </div>

      <div className={styles.warn}>
        Não digite a sua senha de verdade. Teste uma parecida (mesmo tamanho e estilo).
      </div>

      <div className={styles.pwRow}>
        <input
          className={styles.input}
          type={mostrar ? "text" : "password"}
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          placeholder="Digite uma senha para testar"
          autoComplete="off"
          spellCheck={false}
        />
        <button className={styles.btnGhost} onClick={() => setMostrar((m) => !m)}>
          {mostrar ? "Ocultar" : "Mostrar"}
        </button>
      </div>

      {r && nivel ? (
        <>
          <div className={styles.meter}>
            {NIVEIS.map((n, i) => (
              <span
                key={n.nome}
                className={styles.meterSeg}
                style={{ background: i <= r.nivel ? nivel.cor : undefined }}
              />
            ))}
          </div>
          <div className={styles.level} style={{ color: nivel.cor }}>
            Senha {nivel.nome.toLowerCase()}
          </div>
          <div className={styles.time}>
            Um computador potente levaria cerca de <b>{formatarTempo(r.segundos)}</b> para descobrir
            (estimativa).
          </div>

          <div className={styles.checks}>
            {r.criterios.map((c) => (
              <div key={c.texto} className={c.ok ? styles.checkOn : styles.checkOff}>
                {c.ok ? "✓" : "○"} {c.texto}
              </div>
            ))}
          </div>

          <button className={styles.btn} onClick={verificar} disabled={vaz?.estado === "carregando"}>
            {vaz?.estado === "carregando" ? "Verificando…" : "Verificar se já vazou"}
          </button>

          {vaz?.estado === "pronto" &&
            (vaz.vezes ? (
              <div className={styles.breach} style={{ background: "#fff1f0", border: "1px solid #f5c2bd", color: "#b42318" }}>
                Essa senha apareceu <b>{vaz.vezes.toLocaleString("pt-BR")}</b> vezes em vazamentos de
                dados. Não use!
              </div>
            ) : (
              <div className={styles.breach} style={{ background: "#effaf3", border: "1px solid #b7e4c7", color: "#1a7f4b" }}>
                Não encontramos essa senha em vazamentos conhecidos. Isso é bom, mas não garante que
                ela seja forte: veja o medidor acima.
              </div>
            ))}
          {vaz?.estado === "erro" && (
            <div className={styles.breach} style={{ background: "#f4f6f8", border: "1px solid #e6ebf0" }}>
              Não consegui consultar agora. Tente de novo em instantes.
            </div>
          )}
          <div className={styles.hint}>
            Na verificação, só os 5 primeiros caracteres de um código derivado da senha saem do seu
            navegador, nunca a senha.
          </div>
        </>
      ) : (
        <div className={styles.hint} style={{ marginTop: 14 }}>
          Dica: quatro palavras aleatórias com um número, tipo <i>bolo-violeta-trem-72</i>, costumam
          ser fortes e fáceis de lembrar.
        </div>
      )}
    </section>
  );
}
