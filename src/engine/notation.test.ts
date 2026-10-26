import { describe, expect, it } from "vitest";
import { parseNotation } from "./notation";
import type { PuzzleDefinition } from "./types";

describe("parseNotation", () => {
  it("命令と条件色を読み取る", () => {
    expect(parseNotation(["F r:L g:f2 b:pr _"])).toEqual([
      [
        { op: "forward", cond: null },
        { op: "turnLeft", cond: "red" },
        { op: "call2", cond: "green" },
        { op: "paintRed", cond: "blue" },
        null,
      ],
    ]);
  });

  it("ステージ定義に合わせて空きスロットで埋める", () => {
    const def: PuzzleDefinition = {
      board: ["bB"],
      start: { x: 0, y: 0, direction: "right" },
      functions: [3, 2],
      paints: [],
    };
    expect(parseNotation(["F"], def)).toEqual([
      [{ op: "forward", cond: null }, null, null],
      [null, null],
    ]);
  });

  it("スロット数を超えるとエラー", () => {
    const def: PuzzleDefinition = {
      board: ["bB"],
      start: { x: 0, y: 0, direction: "right" },
      functions: [1],
      paints: [],
    };
    expect(() => parseNotation(["F F"], def)).toThrow();
  });

  it("不明な命令・条件色はエラー", () => {
    expect(() => parseNotation(["X"])).toThrow();
    expect(() => parseNotation(["y:F"])).toThrow();
  });
});
