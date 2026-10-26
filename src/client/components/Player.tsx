import { useEffect, useRef } from "react";
import { availableOps, countInstructions, type Program } from "../../engine";
import type { PuzzleDetail } from "../../shared/api";
import { FAILURE_MESSAGE } from "../labels";
import { Link, puzzlePath } from "../router";
import { useSettings } from "../settings";
import { SPEED_MS, type Speed, usePlayer } from "../usePlayer";
import { Board } from "./Board";
import { PauseIcon, PlayIcon, ResetIcon, StepIcon } from "./icons";
import { Palette } from "./Palette";
import { ProgramEditor } from "./ProgramEditor";

const SPEED_LABEL: Record<Speed, string> = { slow: "ゆっくり", normal: "ふつう", fast: "はやい" };

interface PlayerProps {
  puzzle: PuzzleDetail;
  onWin?: (program: Program) => void;
}

export function Player({ puzzle, onWin }: PlayerProps) {
  const { colorAssist } = useSettings();
  const player = usePlayer(puzzle.id, puzzle.definition, { onWin });
  const { game, program, selected } = player;
  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const duration = reducedMotion ? 0 : Math.min(SPEED_MS[player.speed], 320);
  const finished = game.status !== "running";

  // 決着がついたら結果が見えるところまでスクロールする
  const resultRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (finished) resultRef.current?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
  }, [finished]);

  return (
    <div className="player">
      <section className="stage" aria-label="盤面">
        <div className="stage-board">
          <Board
            board={game.board}
            robot={game.robot}
            status={game.status}
            duration={duration}
            colorAssist={colorAssist}
            starsLeft={game.starsLeft}
          />
        </div>

        <div className="stage-status">
          <span>
            星 残り <strong>{game.starsLeft}</strong>
          </span>
          <span>
            手数 <strong>{game.steps}</strong>
          </span>
        </div>

        <div className="result" role="status" aria-live="polite" ref={resultRef}>
          {game.status === "won" && (
            <div className="result-box result-box--won">
              <p className="result-title">クリア</p>
              <p>
                {game.steps} 手、命令 {countInstructions(program)} 個で星をすべて集めました。
              </p>
              <div className="result-actions">
                {puzzle.nextId ? (
                  <Link className="button button--primary" href={puzzlePath(puzzle.nextId)}>
                    次のステージへ
                  </Link>
                ) : (
                  <Link className="button button--primary" href="/">
                    ステージ一覧へ
                  </Link>
                )}
                <button type="button" className="button" onClick={player.reset}>
                  もう一度見る
                </button>
              </div>
            </div>
          )}
          {game.status === "lost" && game.failure && (
            <div className="result-box result-box--lost">
              <p className="result-title">失敗</p>
              <p>{FAILURE_MESSAGE[game.failure]}</p>
              <div className="result-actions">
                <button type="button" className="button" onClick={player.reset}>
                  最初に戻す
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="controls">
          {player.running ? (
            <button type="button" className="button button--primary" onClick={player.pause}>
              <PauseIcon size={18} />
              一時停止
            </button>
          ) : (
            <button type="button" className="button button--primary" onClick={player.run}>
              <PlayIcon size={18} />
              実行
            </button>
          )}
          <button type="button" className="button" onClick={player.stepOnce}>
            <StepIcon size={18} />1 手進める
          </button>
          <button
            type="button"
            className="button"
            onClick={player.reset}
            disabled={game.steps === 0 && !finished}
          >
            <ResetIcon size={18} />
            最初に戻す
          </button>
          <fieldset className="speed">
            <legend className="visually-hidden">速さ</legend>
            {(Object.keys(SPEED_LABEL) as Speed[]).map((speed) => (
              <label key={speed} className="speed-option">
                <input
                  type="radio"
                  name="speed"
                  value={speed}
                  checked={player.speed === speed}
                  onChange={() => player.setSpeed(speed)}
                />
                <span>{SPEED_LABEL[speed]}</span>
              </label>
            ))}
          </fieldset>
        </div>
      </section>

      <section className="editor" aria-label="プログラム">
        <div className="editor-head">
          <h2 className="editor-title">プログラム</h2>
          <button type="button" className="button button--quiet" onClick={player.clearProgram}>
            すべて消す
          </button>
        </div>
        <ProgramEditor
          program={program}
          selected={selected}
          current={game.current}
          onSelect={player.select}
        />
        <Palette
          ops={availableOps(puzzle.definition)}
          selected={selected}
          slot={selected ? (program[selected.fn]?.[selected.slot] ?? null) : null}
          cond={player.selectedCond}
          onOp={player.placeOp}
          onCond={player.setCond}
          onErase={player.clearSlot}
        />
      </section>
    </div>
  );
}
