import { DIRECTIONS, type Direction } from "./direction";
import {
  type Board,
  type Cell,
  COLORS,
  type Color,
  MAX_FUNCTIONS,
  MAX_HEIGHT,
  MAX_SLOTS,
  MAX_WIDTH,
  type PuzzleDefinition,
} from "./types";

export class PuzzleDefinitionError extends Error {
  override name = "PuzzleDefinitionError";
}

const CELL_CHARS: Record<string, Cell> = {
  ".": null,
  r: { color: "red", star: false },
  g: { color: "green", star: false },
  b: { color: "blue", star: false },
  R: { color: "red", star: true },
  G: { color: "green", star: true },
  B: { color: "blue", star: true },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

function fail(message: string): never {
  throw new PuzzleDefinitionError(message);
}

/** 盤面の文字列表現を Board に変換する */
export function createBoard(rows: readonly string[]): Board {
  const height = rows.length;
  const width = rows[0]?.length ?? 0;
  const cells: Cell[] = [];
  for (const row of rows) {
    for (const char of row) {
      const cell = CELL_CHARS[char];
      if (cell === undefined) fail(`盤面に使えない文字があります: "${char}"`);
      cells.push(cell === null ? null : { ...cell });
    }
  }
  return { width, height, cells };
}

export function cellAt(board: Board, x: number, y: number): Cell {
  if (x < 0 || y < 0 || x >= board.width || y >= board.height) return null;
  return board.cells[y * board.width + x] ?? null;
}

export function countStars(board: Board): number {
  return board.cells.filter((cell) => cell?.star).length;
}

/**
 * 外部から受け取った値(D1 の JSON など)を検証して PuzzleDefinition にする。
 * 不正な場合は PuzzleDefinitionError を投げる。
 */
export function parsePuzzleDefinition(input: unknown): PuzzleDefinition {
  if (!isRecord(input)) fail("ステージ定義がオブジェクトではありません");
  const { board, start, functions, paints } = input;

  if (!Array.isArray(board) || board.length === 0) fail("board は 1 行以上必要です");
  if (!board.every((row): row is string => typeof row === "string")) {
    fail("board の各行は文字列である必要があります");
  }
  const width = board[0]?.length ?? 0;
  if (width === 0) fail("board の幅が 0 です");
  if (!board.every((row) => row.length === width)) fail("board の行の長さが揃っていません");
  if (width > MAX_WIDTH || board.length > MAX_HEIGHT) {
    fail(`盤面は最大 ${MAX_WIDTH}×${MAX_HEIGHT} です`);
  }
  const parsedBoard = createBoard(board);
  if (countStars(parsedBoard) === 0) fail("星が 1 つもありません");

  if (!isRecord(start)) fail("start がありません");
  const { x, y, direction } = start;
  if (!isInteger(x) || !isInteger(y)) fail("start の座標が整数ではありません");
  if (!DIRECTIONS.includes(direction as Direction)) fail("start の向きが不正です");
  const startCell = cellAt(parsedBoard, x, y);
  if (!startCell) fail("スタート位置に床がありません");
  if (startCell.star) fail("スタート位置に星を置くことはできません");

  if (!Array.isArray(functions) || functions.length === 0 || functions.length > MAX_FUNCTIONS) {
    fail(`functions は 1〜${MAX_FUNCTIONS} 個必要です`);
  }
  if (!functions.every((n) => isInteger(n) && n >= 1 && n <= MAX_SLOTS)) {
    fail(`各関数のスロット数は 1〜${MAX_SLOTS} です`);
  }

  if (!Array.isArray(paints)) fail("paints は配列である必要があります");
  if (!paints.every((c): c is Color => COLORS.includes(c as Color))) fail("paints の色が不正です");
  if (new Set(paints).size !== paints.length) fail("paints に重複があります");

  return {
    board: [...board],
    start: { x, y, direction: direction as Direction },
    functions: [...functions],
    paints: [...paints],
  };
}
