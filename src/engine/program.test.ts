import { describe, expect, it } from "vitest";
import { parseNotation } from "./notation";
import { availableOps, countInstructions, emptyProgram, parseProgram } from "./program";
import type { PuzzleDefinition } from "./types";

const def: PuzzleDefinition = {
  board: ["bB"],
  start: { x: 0, y: 0, direction: "right" },
  functions: [3, 2],
  paints: ["green"],
};

describe("availableOps", () => {
  it("基本命令・関数の数だけの呼び出し・許可されたペンキを返す", () => {
    expect(availableOps(def)).toEqual([
      "forward",
      "turnLeft",
      "turnRight",
      "call1",
      "call2",
      "paintGreen",
    ]);
  });
});

describe("emptyProgram / countInstructions", () => {
  it("スロット数どおりの空プログラムを作る", () => {
    expect(emptyProgram(def)).toEqual([
      [null, null, null],
      [null, null],
    ]);
  });

  it("置かれた命令だけを数える", () => {
    expect(countInstructions(parseNotation(["F _ f2", "L"], def))).toBe(3);
  });
});

describe("parseProgram", () => {
  it("正しいプログラムを受け付ける", () => {
    const program = parseNotation(["F g:f2 _", "pg R"], def);
    expect(parseProgram(structuredClone(program), def)).toEqual({ ok: true, program });
  });

  it("cond の省略は条件なしとみなす", () => {
    const result = parseProgram(
      [
        [{ op: "forward" }, null, null],
        [null, null],
      ],
      def,
    );
    expect(result).toEqual({
      ok: true,
      program: [
        [{ op: "forward", cond: null }, null, null],
        [null, null],
      ],
    });
  });

  it.each([
    ["配列でない", {}],
    ["関数の数が違う", [[null, null, null]]],
    [
      "スロット数が違う",
      [
        [null, null],
        [null, null],
      ],
    ],
    [
      "存在しない関数の呼び出し",
      [
        [{ op: "call3", cond: null }, null, null],
        [null, null],
      ],
    ],
    [
      "許可されていないペンキ",
      [
        [{ op: "paintRed", cond: null }, null, null],
        [null, null],
      ],
    ],
    [
      "不明な命令",
      [
        [{ op: "jump", cond: null }, null, null],
        [null, null],
      ],
    ],
    [
      "不正な条件色",
      [
        [{ op: "forward", cond: "pink" }, null, null],
        [null, null],
      ],
    ],
    [
      "命令が文字列",
      [
        ["forward", null, null],
        [null, null],
      ],
    ],
  ])("%s場合は拒否する", (_, input) => {
    expect(parseProgram(input, def).ok).toBe(false);
  });
});
