import { useCallback, useEffect, useState } from "react";
import type { Program } from "../../engine";
import { fetchPuzzle, reportClear } from "../api";
import { Difficulty } from "../components/Difficulty";
import { Player } from "../components/Player";
import { Link } from "../router";
import { loadCleared, markCleared } from "../storage";
import { useAsync } from "../useAsync";

export function PlayPage({ id }: { id: string }) {
  const state = useAsync(id, (signal) => fetchPuzzle(id, signal));
  const [solves, setSolves] = useState<number | null>(null);
  const [cleared, setCleared] = useState(() => loadCleared().has(id));

  useEffect(() => {
    setSolves(null);
    setCleared(loadCleared().has(id));
  }, [id]);

  useEffect(() => {
    if (state.status === "ready") document.title = `${state.data.title} | RoboZZle`;
  }, [state]);

  // クリア人数は、このブラウザで初めてクリアしたときだけ報告する
  const handleWin = useCallback(
    (program: Program) => {
      if (loadCleared().has(id)) return;
      markCleared(id);
      setCleared(true);
      reportClear(id, program).then(setSolves, () => {
        // 報告に失敗しても遊ぶのには影響しない
      });
    },
    [id],
  );

  if (state.status === "loading") {
    return <p className="page-message">ステージを読み込んでいます</p>;
  }
  if (state.status === "error") {
    return (
      <div className="page-message">
        <p>{state.error.message}</p>
        <Link href="/">ステージ一覧に戻る</Link>
      </div>
    );
  }

  const puzzle = state.data;
  return (
    <article className="play">
      <header className="play-head">
        <Link className="back-link" href="/">
          ステージ一覧
        </Link>
        <h1 className="play-title">{puzzle.title}</h1>
        <div className="play-meta">
          <Difficulty level={puzzle.difficulty} />
          <span>{solves ?? puzzle.solves} 人がクリア</span>
          {cleared && <span className="cleared-mark">クリア済み</span>}
        </div>
        <details className="hint">
          <summary>ヒントを見る</summary>
          <p>{puzzle.hint}</p>
        </details>
      </header>
      <Player key={puzzle.id} puzzle={puzzle} onWin={handleWin} />
    </article>
  );
}
