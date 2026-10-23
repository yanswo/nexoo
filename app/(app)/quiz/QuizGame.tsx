"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  answerQuestion,
  getQuizStatus,
  nextQuestion,
  startQuiz,
  type QuizAnswerResult,
  type QuizNext,
  type QuizQuestion,
  type QuizStatus,
} from "./actions";
import styles from "./quiz.module.css";

type Phase = "loading" | "empty" | "intro" | "question" | "feedback" | "finished" | "error";
const SHAPES = ["\u25b2", "\u25c6", "\u25cf", "\u25a0"];
const TONES = [styles.optA, styles.optB, styles.optC, styles.optD];
const LEVEL = { easy: "F\u00e1cil", medium: "M\u00e9dia", hard: "Dif\u00edcil" } as const;

export default function QuizGame() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [status, setStatus] = useState<QuizStatus | null>(null);
  const [question, setQuestion] = useState<QuizQuestion | null>(null);
  const [result, setResult] = useState<QuizAnswerResult | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const answeringRef = useRef(false);
  const deadlineRef = useRef(0);

  const showNext = useCallback((next: QuizNext) => {
    if (next.status === "question") {
      answeringRef.current = false;
      setPicked(null);
      setResult(null);
      setQuestion(next.question);
      setPhase("question");
    } else if (next.status === "finished") {
      void getQuizStatus().then((current) => {
        if ("error" in current) {
          setMessage(current.error);
          setPhase("error");
        } else {
          setStatus(current);
          setPhase("finished");
        }
      });
    } else {
      setMessage(next.message);
      setPhase("error");
    }
  }, []);

  useEffect(() => {
    void getQuizStatus().then((current) => {
      if ("error" in current) {
        setMessage(current.error);
        setPhase("error");
      } else {
        setStatus(current);
        if (current.total === 0) setPhase("empty");
        else setPhase(current.status === "finished" ? "finished" : "intro");
      }
    });
  }, []);

  const submit = useCallback(async (choice: number) => {
    if (answeringRef.current) return;
    answeringRef.current = true;
    setPicked(choice);
    const response = await answerQuestion(choice);
    if ("error" in response) {
      setMessage(response.error);
      setPhase("error");
      return;
    }
    setResult(response);
    setPhase("feedback");
  }, []);

  useEffect(() => {
    if (phase !== "question" || !question) return;
    deadlineRef.current = performance.now() + question.remainingMs;
    const initial = window.setTimeout(() => setRemaining(question.remainingMs), 0);
    const timer = window.setInterval(() => {
      const left = Math.max(0, deadlineRef.current - performance.now());
      setRemaining(left);
      if (left <= 0) {
        window.clearInterval(timer);
        void submit(-1);
      }
    }, 100);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, [phase, question, submit]);

  async function begin() {
    setBusy(true);
    try {
      await document.documentElement.requestFullscreen?.();
    } catch {
      // Alguns navegadores bloqueiam tela cheia sem interação suficiente.
    }
    showNext(status?.status === "in_progress" ? await nextQuestion() : await startQuiz());
    setBusy(false);
  }

  async function advance() {
    if (result?.finished) {
      showNext({ status: "finished" });
      return;
    }
    setBusy(true);
    showNext(await nextQuestion());
    setBusy(false);
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.().catch(() => {});
  }

  const ratio = question ? Math.min(1, remaining / question.timeLimitMs) : 0;
  const seconds = Math.ceil(remaining / 1000);

  return (
    <div className={styles.root}>
      <div className={styles.topBar}>
        <Link href="/inicio" className={styles.close} aria-label="Sair do quiz">{"\u00d7"}</Link>
        <button className={styles.fsBtn} onClick={toggleFullscreen} aria-label="Tela cheia">{"\u26f6"}</button>
      </div>

      {phase === "loading" && <div className={styles.center}>Carregando...</div>}

      {phase === "empty" && (
        <div className={styles.center}>
          <div className={styles.badge}>Desafio Nexo</div>
          <h1 className={styles.h1}>Quiz em preparação</h1>
          <p className={styles.lead}>Ainda não existem perguntas cadastradas. Tente novamente depois.</p>
          <Link href="/inicio" className={styles.primary}>Voltar ao início</Link>
        </div>
      )}

      {phase === "error" && (
        <div className={styles.center}>
          <h1 className={styles.h1}>Ops!</h1>
          <p className={styles.lead}>{message}</p>
          <Link href="/inicio" className={styles.primary}>Voltar ao início</Link>
        </div>
      )}

      {phase === "intro" && status && (
        <div className={styles.center}>
          <div className={styles.badge}>Desafio Nexo</div>
          <h1 className={styles.h1}>Segurança de dados</h1>
          <p className={styles.lead}>
            {status.total} perguntas, do fácil ao difícil. Quanto mais rápido você acertar, mais pontos ganha.
          </p>
          <ul className={styles.rules}>
            <li>{"\u23f1"} Cada pergunta tem cronômetro medido pelo servidor.</li>
            <li>Uma tentativa por conta; atualizar a página não dá vantagem.</li>
            <li>{"\ud83c\udf6b"} O primeiro lugar no ranking leva uma caixa de bombons.</li>
          </ul>
          <button className={styles.primary} onClick={begin} disabled={busy}>
            {busy ? "Preparando..." : status.status === "in_progress" ? "Continuar" : "Começar"}
          </button>
        </div>
      )}

      {phase === "question" && question && (
        <div className={styles.game}>
          <div className={styles.hud}>
            <span>{question.position}/{question.total}</span>
            <span className={styles.level}>{LEVEL[question.difficulty]}</span>
            <span>{question.streak > 1 ? `\ud83d\udd25 ${question.streak}  ` : ""}{question.score} pts</span>
          </div>
          <div className={styles.timer}>
            <div className={styles.timerBar} style={{ width: `${ratio * 100}%`, background: ratio < 0.25 ? "#e0562f" : "#ef6f58" }} />
            <span className={styles.timerText}>{seconds}</span>
          </div>
          <h2 className={styles.prompt}>{question.prompt}</h2>
          <div className={styles.options}>
            {question.options.map((option, index) => (
              <button key={index} className={`${styles.option} ${TONES[index]}`} disabled={picked !== null} onClick={() => void submit(index)}>
                <span className={styles.shape}>{SHAPES[index]}</span><span>{option}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === "feedback" && question && result && (
        <div className={styles.center}>
          <div className={result.correct ? styles.okMark : styles.badMark}>
            {result.correct ? "\u2713" : result.timedOut ? "\u23f1" : "\u2715"}
          </div>
          <h1 className={styles.h1}>
            {result.correct ? `+${result.points} pontos` : result.timedOut ? "Tempo esgotado" : "Não foi dessa vez"}
          </h1>
          {result.correct && result.bonus > 0 && <p className={styles.lead}>Inclui +{result.bonus} de bônus por acertos seguidos {"\ud83d\udd25"}</p>}
          {!result.correct && <p className={styles.lead}>Resposta certa: <b>{question.options[result.correctIndex]}</b></p>}
          <p className={styles.explain}>{result.explanation}</p>
          <div className={styles.scoreLine}>Total: {result.score} pts</div>
          <button className={styles.primary} onClick={advance} disabled={busy}>{result.finished ? "Ver resultado" : "Próxima pergunta"}</button>
        </div>
      )}

      {phase === "finished" && status && (
        <div className={styles.center}>
          <div className={styles.badge}>Quiz concluído</div>
          <h1 className={styles.h1}>{status.score} pontos</h1>
          <p className={styles.lead}>Você acertou {status.correctCount} de {status.total}.</p>
          {status.rank > 0 && <div className={styles.rank}>{status.rank}º lugar no ranking</div>}
          <div className={styles.row}>
            <Link href="/quiz/ranking" className={styles.primary}>Ver ranking</Link>
            <Link href="/inicio" className={styles.ghost}>Voltar ao início</Link>
          </div>
        </div>
      )}
    </div>
  );
}
