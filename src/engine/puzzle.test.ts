import { describe, expect, it } from "vitest";
import { cellAt, countStars, createBoard, parsePuzzleDefinition } from "./puzzle";
import type { PuzzleDefinition } from "./types";

const valid: PuzzleDefinition = {
  board: ["rgb.", "RGB."],
  start: { x: 0, y: 0, direction: "down" },
  functions: [5, 3],
  paints: ["red"],
};

describe("createBoard", () => {
  it("文字を色・星・床なしに変換する", () => {
    const board = createBoard(valid.board);
    expect(board.width).toBe(4);
    expect(board.height).toBe(2);
    expect(cellAt(board, 1, 0)).toEqual({ color: "green", star: false });
    expect(cellAt(board, 2, 1)).toEqual({ color: "blue", star: true });
    expect(cellAt(board, 3, 0)).toBeNull();
    expect(countStars(board)).toBe(3);
  });

  it("盤面の外は床なし扱い", () => {
    const board = createBoard(valid.board);
    expect(cellAt(board, -1, 0)).toBeNull();
    expect(cellAt(board, 0, 2)).toBeNull();
  });
});

describe("parsePuzzleDefinition", () => {
  it("正しい定義をそのまま返す", () => {
    expect(parsePuzzleDefinition(structuredClone(valid))).toEqual(valid);
  });

  it.each([
    ["オブジェクトでない", null],
    ["盤面が空", { ...valid, board: [] }],
    ["行の長さが不揃い", { ...valid, board: ["rgb", "RG"] }],
    ["不明な文字", { ...valid, board: ["rgx.", "RGB."] }],
    ["幅が上限超え", { ...valid, board: ["B".padEnd(17, "b")] }],
    ["高さが上限超え", { ...valid, board: Array.from({ length: 13 }, () => "B") }],
    ["星がない", { ...valid, board: ["rgb.", "rgb."] }],
    ["スタートが床なし", { ...valid, start: { x: 3, y: 0, direction: "up" } }],
    ["スタートが盤面外", { ...valid, start: { x: 9, y: 0, direction: "up" } }],
    ["スタートに星", { ...valid, start: { x: 0, y: 1, direction: "up" } }],
    ["向きが不正", { ...valid, start: { x: 0, y: 0, direction: "north" } }],
    ["座標が小数", { ...valid, start: { x: 0.5, y: 0, direction: "up" } }],
    ["関数がない", { ...valid, functions: [] }],
    ["関数が多すぎる", { ...valid, functions: [1, 1, 1, 1, 1, 1] }],
    ["スロット数が 0", { ...valid, functions: [0] }],
    ["スロット数が上限超え", { ...valid, functions: [11] }],
    ["不明なペンキ", { ...valid, paints: ["yellow"] }],
    ["ペンキの重複", { ...valid, paints: ["red", "red"] }],
  ])("%s場合はエラー", (_, input) => {
    expect(() => parsePuzzleDefinition(input)).toThrow();
  });
});
