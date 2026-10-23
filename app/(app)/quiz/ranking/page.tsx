import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AutoRefresh from "../../admin/AutoRefresh";
import styles from "../quiz.module.css";

type Row = {
  user_id: string;
  full_name: string;
  score: number;
  correct_count: number;
  total_time_ms: number;
  finished: boolean;
  answered: number;
  total: number;
};

export default async function RankingPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("quiz_leaderboard", { max_rows: 10 });
  if (error) console.error("quiz_leaderboard:", error.message);
  const rows = (data ?? []) as Row[];
  const medal = ["\ud83e\udd47", "\ud83e\udd48", "\ud83e\udd49"];

  return (
    <div className={styles.root}>
      <AutoRefresh seconds={3} />
      <div className={styles.topBar}>
        <Link href="/inicio" className={styles.close} aria-label="Voltar">{"\u00d7"}</Link>
      </div>
      <div className={styles.board}>
        <h1 className={styles.boardTitle}>Ranking do Desafio Nexo</h1>
        <div className={styles.prize}>{"\ud83c\udf6b"} O primeiro lugar leva uma caixa de bombons!</div>
        {error ? (
          <div className={styles.emptyBoard}>
            N\\u00e3o foi poss\\u00edvel carregar o ranking agora. Verifique se a migration do ranking foi aplicada no Supabase.
          </div>
        ) : rows.length === 0 ? (
          <div className={styles.emptyBoard}>Ninguém jogou ainda. Seja o primeiro!</div>
        ) : (
          <div className={styles.list}>
            {rows.map((row, index) => (
              <div className={styles.item} key={row.user_id}>
                <div className={styles.pos}>{medal[index] ?? `${index + 1}\u00ba`}</div>
                <div>
                  <div className={styles.name}>
                    {row.full_name}
                    {!row.finished && <span className={styles.live}>jogando {row.answered}/{row.total}</span>}
                  </div>
                  <div className={styles.meta}>
                    {row.correct_count} acertos {"\u00b7"} {(Number(row.total_time_ms) / 1000).toFixed(1)}s de resposta
                  </div>
                </div>
                <div className={styles.pts}>{row.score} pts</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
