import type { Color, Instruction, Op, Program, PuzzleDefinition, Slot } from "./types";

/**
 * プログラムを短く書くための記法。テストや模範解答の記述に使う。
 *
 * 関数ごとに空白区切りで命令を並べる。命令の前に `r:` `g:` `b:` を付けると条件色になる。
 * - `F` 前進 / `L` 左回転 / `R` 右回転
 * - `f1`〜`f5` 関数呼び出し
 * - `pr` `pg` `pb` 赤・緑・青に塗る
 * - `_` 空きスロット
 *
 * 例: `["F r:R f1"]` → F1 = [前進, 赤なら右回転, F1 を呼ぶ]
 */
const OPS: Record<string, Op> = {
  F: "forward",
  L: "turnLeft",
  R: "turnRight",
  f1: "call1",
  f2: "call2",
  f3: "call3",
  f4: "call4",
  f5: "call5",
  pr: "paintRed",
  pg: "paintGreen",
  pb: "paintBlue",
};

const CONDS: Record<string, Color> = { r: "red", g: "green", b: "blue" };

function parseToken(token: string): Slot {
  if (token === "_") return null;
  const [condPart, opPart] = token.includes(":") ? token.split(":") : [undefined, token];
  const op = opPart === undefined ? undefined : OPS[opPart];
  if (!op) throw new Error(`不明な命令: ${token}`);
  let cond: Color | null = null;
  if (condPart !== undefined) {
    const parsed = CONDS[condPart];
    if (!parsed) throw new Error(`不明な条件色: ${token}`);
    cond = parsed;
  }
  const instruction: Instruction = { op, cond };
  return instruction;
}

/** 記法からプログラムを作る。def を渡すと各関数をスロット数まで空きで埋める */
export function parseNotation(functions: readonly string[], def?: PuzzleDefinition): Program {
  const count = Math.max(functions.length, def?.functions.length ?? 0);
  return Array.from({ length: count }, (_, i) => {
    const source = functions[i]?.trim() ?? "";
    const slots = source === "" ? [] : source.split(/\s+/).map(parseToken);
    const size = def?.functions[i];
    if (size !== undefined) {
      if (slots.length > size) {
        throw new Error(`F${i + 1} の命令数 ${slots.length} がスロット数 ${size} を超えています`);
      }
      while (slots.length < size) slots.push(null);
    }
    return slots;
  });
}
