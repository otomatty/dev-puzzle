import type { Direction } from "./direction";

export const COLORS = ["red", "green", "blue"] as const;
export type Color = (typeof COLORS)[number];

export const MAX_FUNCTIONS = 5;
export const MAX_SLOTS = 10;
export const MAX_WIDTH = 16;
export const MAX_HEIGHT = 12;

export const CALL_OPS = ["call1", "call2", "call3", "call4", "call5"] as const;
export type CallOp = (typeof CALL_OPS)[number];

export const PAINT_OPS = {
  red: "paintRed",
  green: "paintGreen",
  blue: "paintBlue",
} as const satisfies Record<Color, string>;
export type PaintOp = (typeof PAINT_OPS)[Color];

export type MoveOp = "forward" | "turnLeft" | "turnRight";
export type Op = MoveOp | CallOp | PaintOp;

/** 1 つの命令。cond が null なら常に実行し、色が指定されていれば足元がその色のときだけ実行する */
export interface Instruction {
  op: Op;
  cond: Color | null;
}

/** 空きスロットは null */
export type Slot = Instruction | null;

/** program[関数番号][スロット番号]。関数番号 0 が F1 */
export type Program = Slot[][];

export interface Tile {
  color: Color;
  star: boolean;
}

/** null は床がない(落ちる)マス */
export type Cell = Tile | null;

export interface Board {
  width: number;
  height: number;
  /** y * width + x の順に並ぶ */
  cells: readonly Cell[];
}

export interface Position {
  x: number;
  y: number;
}

export interface Robot extends Position {
  direction: Direction;
}

/**
 * ステージの定義。保存・配信はこの形のまま JSON で行う。
 *
 * board の各文字:
 * - `.` 床なし
 * - `r` `g` `b` 赤・緑・青の床
 * - `R` `G` `B` 星が置かれた赤・緑・青の床
 */
export interface PuzzleDefinition {
  board: string[];
  start: Robot;
  /** 関数ごとのスロット数。要素数が使える関数の数になる(F1 から順) */
  functions: number[];
  /** 使えるペンキの色 */
  paints: Color[];
}
