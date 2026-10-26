import {
  CALL_OPS,
  COLORS,
  type Color,
  type Instruction,
  type Op,
  PAINT_OPS,
  type Program,
  type PuzzleDefinition,
  type Slot,
} from "./types";

/** そのステージで使える命令の一覧(パレットの並び順) */
export function availableOps(def: PuzzleDefinition): Op[] {
  return [
    "forward",
    "turnLeft",
    "turnRight",
    ...CALL_OPS.slice(0, def.functions.length),
    ...def.paints.map((color) => PAINT_OPS[color]),
  ];
}

export function emptyProgram(def: PuzzleDefinition): Program {
  return def.functions.map((size) => Array.from({ length: size }, (): Slot => null));
}

/** 置かれている命令の数(空きスロットは数えない) */
export function countInstructions(program: Program): number {
  return program.reduce((sum, fn) => sum + fn.filter((slot) => slot !== null).length, 0);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export type ParseProgramResult = { ok: true; program: Program } | { ok: false; error: string };

/**
 * 外部から受け取った値をステージに合ったプログラムとして検証する。
 * 関数・スロットの数、使えない命令(存在しない関数の呼び出し、許可されていないペンキ)を弾く。
 */
export function parseProgram(input: unknown, def: PuzzleDefinition): ParseProgramResult {
  if (!Array.isArray(input) || input.length !== def.functions.length) {
    return { ok: false, error: `関数の数は ${def.functions.length} 個である必要があります` };
  }
  const allowed = new Set<string>(availableOps(def));
  const program: Program = [];

  for (const [fnIndex, fn] of input.entries()) {
    const size = def.functions[fnIndex];
    if (!Array.isArray(fn) || fn.length !== size) {
      return { ok: false, error: `F${fnIndex + 1} のスロット数は ${size} である必要があります` };
    }
    const slots: Slot[] = [];
    for (const slot of fn) {
      if (slot === null) {
        slots.push(null);
        continue;
      }
      if (!isRecord(slot) || typeof slot.op !== "string" || !allowed.has(slot.op)) {
        return { ok: false, error: `F${fnIndex + 1} に使えない命令があります` };
      }
      const cond = slot.cond ?? null;
      if (cond !== null && !COLORS.includes(cond as Color)) {
        return { ok: false, error: `F${fnIndex + 1} に不正な条件色があります` };
      }
      const instruction: Instruction = { op: slot.op as Op, cond: cond as Color | null };
      slots.push(instruction);
    }
    program.push(slots);
  }
  return { ok: true, program };
}
