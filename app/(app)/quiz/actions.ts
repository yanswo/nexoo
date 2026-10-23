"use server";

import { createClient } from "@/lib/supabase/server";

// As regras, o tempo e as respostas certas ficam no banco (funÃ§Ãµes quiz_*).
// Aqui sÃ³ repassamos o que a pessoa fez e devolvemos o resultado.

export type QuizQuestion = {
  position: number;
  total: number;
  prompt: string;
  options: string[];
  difficulty: "easy" | "medium" | "hard";
  timeLimitMs: number;
  remainingMs: number;
  score: number;
  streak: number;
};

export type QuizAnswerResult = {
  correct: boolean;
  timedOut: boolean;
  points: number;
  bonus: number;
  correctIndex: number;
  explanation: string;
  score: number;
  streak: number;
  finished: boolean;
};

export type QuizStatus = {
  status: "not_started" | "in_progress" | "finished";
  total: number;
  score: number;
  correctCount: number;
  answered: number;
  rank: number;
};

export type QuizNext =
  | { status: "question"; question: QuizQuestion }
  | { status: "finished" }
  | { status: "error"; message: string };

function friendly(message: string) {
  return message.startsWith("Nexo:") ? message.slice(5).trim() : "Algo deu errado. Tente de novo.";
}

function toQuestion(raw: Record<string, unknown>): QuizQuestion {
  return {
    position: Number(raw.position),
    total: Number(raw.total),
    prompt: String(raw.prompt),
    options: (raw.options as unknown[]).map(String),
    difficulty: raw.difficulty as QuizQuestion["difficulty"],
    timeLimitMs: Number(raw.time_limit_ms),
    remainingMs: Number(raw.remaining_ms),
    score: Number(raw.score ?? 0),
    streak: Number(raw.streak ?? 0),
  };
}

export async function getQuizStatus(): Promise<QuizStatus | { error: string }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("quiz_status");
    if (error || !data) return { error: friendly(error?.message ?? "quiz_status") };
    return {
      status: data.status,
      total: Number(data.total ?? 0),
      score: Number(data.score ?? 0),
      correctCount: Number(data.correct_count ?? 0),
      answered: Number(data.answered ?? 0),
      rank: Number(data.rank ?? 0),
    };
  } catch (error) {
    console.error("quiz_status:", error);
    return { error: "Não foi possível carregar o quiz agora." };
  }
}

export async function nextQuestion(): Promise<QuizNext> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("quiz_question");
    if (error || !data) return { status: "error", message: friendly(error?.message ?? "quiz_question") };
    if (data.status === "finished") return { status: "finished" };
    if (!Array.isArray(data.options) || data.options.length !== 4) {
      return { status: "error", message: "Pergunta inválida recebida do servidor." };
    }
    return { status: "question", question: toQuestion(data) };
  } catch (error) {
    console.error("quiz_question:", error);
    return { status: "error", message: "Não foi possível iniciar a pergunta." };
  }
}

export async function startQuiz(): Promise<QuizNext> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("quiz_start");
    if (error) return { status: "error", message: friendly(error.message) };
    return nextQuestion();
  } catch (error) {
    console.error("quiz_start:", error);
    return { status: "error", message: "Não foi possível iniciar o quiz." };
  }
}

// choice = -1 significa "tempo esgotado".
export async function answerQuestion(choice: number): Promise<QuizAnswerResult | { error: string }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("quiz_answer", { choice: Math.trunc(choice) });
    if (error || !data) return { error: friendly(error?.message ?? "quiz_answer") };
    return {
      correct: Boolean(data.correct),
      timedOut: Boolean(data.timed_out),
      points: Number(data.points),
      bonus: Number(data.bonus),
      correctIndex: Number(data.correct_index),
      explanation: String(data.explanation ?? ""),
      score: Number(data.score),
      streak: Number(data.streak),
      finished: Boolean(data.finished),
    };
  } catch (error) {
    console.error("quiz_answer:", error);
    return { error: "Não foi possível registrar essa resposta." };
  }
}

