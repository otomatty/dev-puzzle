import { describe, expect, it } from "vitest";
import { compileProgram, createGame, type GameState, runToEnd, step } from "./machine";
import { parseNotation } from "./notation";
import { cellAt } from "./puzzle";
import type { PuzzleDefinition } from "./types";

function puzzle(overrides: Partial<PuzzleDefinition> = {}): PuzzleDefinition {
  return {
    board: ["bbbB"],
    start: { x: 0, y: 0, direction: "right" },
    functions: [10, 10, 10],
    paints: ["red", "green", "blue"],
    ...overrides,
  };
}

function run(def: PuzzleDefinition, ...fns: string[]) {
  return runToEnd(def, parseNotation(fns, def));
}

/** 1 命令ずつ実行した状態の列を返す */
function trace(def: PuzzleDefinition, ...fns: string[]): GameState[] {
  const program = compileProgram(parseNotation(fns, def));
  const states = [createGame(def)];
  let state = states[0] as GameState;
  while (state.status === "running") {
    state = step(state, program);
    states.push(state);
  }
  return states;
}

describe("初期状態", () => {
  it("スタート位置・星の数・F1 から実行を始める", () => {
    const state = createGame(puzzle({ board: ["bBbB"] }));
    expect(state.robot).toEqual({ x: 0, y: 0, direction: "right" });
    expect(state.starsLeft).toBe(2);
    expect(state.stack).toEqual([{ fn: 0, pc: 0 }]);
    expect(state.status).toBe("running");
  });
});

describe("移動と回転", () => {
  it("前進して星をすべて取るとクリア", () => {
    const end = run(puzzle(), "F F F");
    expect(end.status).toBe("won");
    expect(end.robot).toMatchObject({ x: 3, y: 0 });
    expect(end.steps).toBe(3);
    expect(end.starsLeft).toBe(0);
  });

  it("取った星は盤面から消える", () => {
    const end = run(puzzle({ board: ["bBbB"] }), "F");
    expect(cellAt(end.board, 1, 0)).toEqual({ color: "blue", star: false });
    expect(end.starsLeft).toBe(1);
  });

  it("クリアした時点で残りの命令は実行しない", () => {
    const end = run(puzzle(), "F F F L L");
    expect(end.status).toBe("won");
    expect(end.robot.direction).toBe("right");
  });

  it("左右に回転できる", () => {
    const def = puzzle({ board: ["b.", "bB"], start: { x: 0, y: 0, direction: "right" } });
    expect(run(def, "R F L F").status).toBe("won");
  });

  it("床のないマスに進むと落ちる", () => {
    const end = run(puzzle({ board: ["b.B"] }), "F F");
    expect(end.status).toBe("lost");
    expect(end.failure).toBe("fell");
    expect(end.robot).toMatchObject({ x: 1, y: 0 });
  });

  it("盤面の外に出ると落ちる", () => {
    const end = run(puzzle(), "L F");
    expect(end).toMatchObject({ status: "lost", failure: "fell" });
  });
});

describe("命令切れ", () => {
  it("星が残ったまま命令がなくなると失敗", () => {
    const end = run(puzzle(), "F");
    expect(end).toMatchObject({ status: "lost", failure: "outOfInstructions", steps: 1 });
  });

  it("空のプログラムは 1 ステップ目で失敗", () => {
    const end = run(puzzle(), "");
    expect(end).toMatchObject({ status: "lost", failure: "outOfInstructions", steps: 0 });
  });

  it("空きスロットは読み飛ばす", () => {
    expect(run(puzzle(), "F _ F _ _ F").status).toBe("won");
  });
});

describe("条件色", () => {
  const def = puzzle({ board: ["brbB"] });

  it("足元の色が一致したときだけ実行する", () => {
    // 青の上では r:L を飛ばし、赤の上では実行する
    const states = trace(def, "F r:L r:L r:L r:L F F");
    const end = states.at(-1) as GameState;
    expect(end.status).toBe("won");
    expect(end.steps).toBe(7);
  });

  it("条件が合わず飛ばした命令はステップ数に数えない", () => {
    const end = run(def, "r:L F F F");
    expect(end.steps).toBe(3);
    expect(end.status).toBe("won");
  });

  it("直前に実行した命令の位置を記録する", () => {
    const states = trace(def, "r:L F");
    expect(states[1]?.current).toEqual({ fn: 0, slot: 1 });
  });
});

describe("関数呼び出し", () => {
  it("呼んだ関数が終わると呼び出し元の続きに戻る", () => {
    const def = puzzle({ board: ["bbbB"] });
    const end = run(def, "f2 F f2", "F");
    expect(end.status).toBe("won");
    expect(end.robot.x).toBe(3);
  });

  it("再帰でくり返せる", () => {
    const def = puzzle({ board: ["bbbbbbbbbbbB"] });
    const end = run(def, "F f1");
    expect(end.status).toBe("won");
    expect(end.steps).toBe(21);
  });

  it("末尾での呼び出しはスタックを伸ばさない", () => {
    const def = puzzle({ board: ["bbbbbbbbbbbB"] });
    const states = trace(def, "F f1");
    expect(Math.max(...states.map((s) => s.stack.length))).toBe(1);
  });

  it("末尾以外の呼び出しはスタックに積まれ、戻りながら残りを実行する", () => {
    // 赤に着くまで再帰で進み、折り返して同じ距離だけ戻る
    const def = puzzle({ board: ["bbbr", "B..."] });
    const end = run(def, "f2 L F", "F b:f2 r:L r:L F");
    expect(end.status).toBe("won");
    expect(end.robot).toMatchObject({ x: 0, y: 1 });
  });

  it("呼び出しが深くなりすぎるとスタックオーバーフロー", () => {
    const end = runToEnd(puzzle(), parseNotation(["L f1 F"]), {
      maxSteps: 1000,
      maxStackDepth: 10,
    });
    expect(end).toMatchObject({ status: "lost", failure: "stackOverflow" });
    expect(end.stack.length).toBe(11);
  });

  it("無限ループはステップ上限で止まる", () => {
    const end = runToEnd(puzzle(), parseNotation(["L f1"]), { maxSteps: 50, maxStackDepth: 10 });
    expect(end).toMatchObject({ status: "lost", failure: "stepLimit", steps: 50 });
  });
});

describe("ペンキ", () => {
  it("足元の床の色を塗り替える", () => {
    const end = run(puzzle(), "pr F");
    expect(cellAt(end.board, 0, 0)?.color).toBe("red");
  });

  it("塗った色が以降の条件判定に反映される", () => {
    const def = puzzle({ board: ["bb", ".B"], start: { x: 1, y: 0, direction: "right" } });
    expect(run(def, "pg g:R F").status).toBe("won");
  });

  it("塗っても星は残る", () => {
    const def = puzzle({ board: ["bB"] });
    const end = run(def, "F");
    expect(end.status).toBe("won");
    const painted = runToEnd(def, parseNotation(["pr"], def));
    expect(cellAt(painted.board, 1, 0)?.star).toBe(true);
  });
});

describe("step", () => {
  it("決着後に呼んでも状態は変わらない", () => {
    const def = puzzle();
    const end = runToEnd(def, parseNotation(["F F F"], def));
    expect(step(end, compileProgram(parseNotation(["F"])))).toBe(end);
  });

  it("元の状態を書き換えない", () => {
    const def = puzzle({ board: ["bB"] });
    const start = createGame(def);
    const snapshot = structuredClone(start);
    step(start, compileProgram(parseNotation(["F"])));
    expect(start).toEqual(snapshot);
  });
});
