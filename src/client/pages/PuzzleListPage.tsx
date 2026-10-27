import { useEffect, useMemo } from "react";
import { createBoard } from "../../engine";
import { fetchPuzzles } from "../api";
import { Board } from "../components/Board";
import { Difficulty } from "../components/Difficulty";
import { Link, puzzlePath } from "../router";
import { loadCleared } from "../storage";
import { useAsync } from "../useAsync";

export function PuzzleListPage() {
  const state = useAsync("puzzles", (signal) => fetchPuzzles(signal));
  const cleared = useMemo(() => loadCleared(), []);

  useEffect(() => {
    document.title = "DevPuzzle";
  }, []);

  return (
    <div className="list">
      <header className="list-intro">
        <h1 className="list-title">ステージを選ぶ</h1>
        <p>
          ロボットに命令を並べて、盤面の星をすべて集めましょう。命令には「赤い床のときだけ」のような条件を付けたり、関数にまとめてくり返したりできます。
        </p>
        {state.status === "ready" && (
          <p className="list-progress">
            {state.data.length} ステージ中 {state.data.filter((p) => cleared.has(p.id)).length}{" "}
            ステージをクリア
          </p>
        )}
      </header>

      {state.status === "loading" && <p className="page-message">ステージを読み込んでいます</p>}
      {state.status === "error" && <p className="page-message">{state.error.message}</p>}
      {state.status === "ready" && (
        <ol className="stage-list">
          {state.data.map((puzzle, index) => {
            const isCleared = cleared.has(puzzle.id);
            return (
              <li key={puzzle.id}>
                <Link
                  className={isCleared ? "stage-card stage-card--cleared" : "stage-card"}
                  href={puzzlePath(puzzle.id)}
                >
                  <span className="stage-card-board">
                    <Board
                      board={createBoard(puzzle.definition.board)}
                      robot={puzzle.definition.start}
                      thumbnail
                    />
                  </span>
                  <span className="stage-card-number">{index + 1}</span>
                  <span className="stage-card-title">{puzzle.title}</span>
                  <span className="stage-card-meta">
                    <Difficulty level={puzzle.difficulty} />
                    {isCleared ? (
                      <span className="cleared-mark">クリア済み</span>
                    ) : (
                      <span>{puzzle.solves} 人がクリア</span>
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
