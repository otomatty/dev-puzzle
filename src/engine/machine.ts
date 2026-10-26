import { delta, turnLeft, turnRight } from "./direction";
import { cellAt, countStars, createBoard } from "./puzzle";
import type {
  Board,
  CallOp,
  Color,
  Instruction,
  Program,
  PuzzleDefinition,
  Robot,
  Tile,
} from "./types";

export type Status = "running" | "won" | "lost";

export type FailureReason =
  /** 床のないマスや盤面の外に出た */
  | "fell"
  /** 星が残ったまま命令がなくなった */
  | "outOfInstructions"
  /** 実行ステップ数の上限に達した(無限ループ) */
  | "stepLimit"
  /** 関数呼び出しが深くなりすぎた */
  | "stackOverflow";

export interface Limits {
  maxSteps: number;
  maxStackDepth: number;
}

export const DEFAULT_LIMITS: Limits = { maxSteps: 1000, maxStackDepth: 100 };

/** 実行中の関数と、次に読む命令の位置(空きスロットを除いた番号) */
export interface Frame {
  fn: number;
  pc: number;
}

export interface SlotRef {
  fn: number;
  slot: number;
}

export interface GameState {
  board: Board;
  robot: Robot;
  starsLeft: number;
  stack: readonly Frame[];
  /** 実行した命令の数(条件が合わずに飛ばした命令は数えない) */
  steps: number;
  status: Status;
  failure: FailureReason | null;
  /** 直前に実行した命令の位置。UI のハイライトに使う */
  current: SlotRef | null;
}

/** 空きスロットを詰めた実行用のプログラム */
export type CompiledProgram = ReadonlyArray<
  ReadonlyArray<{ slot: number; instruction: Instruction }>
>;

export function compileProgram(program: Program): CompiledProgram {
  return program.map((fn) =>
    fn.flatMap((instruction, slot) => (instruction ? [{ slot, instruction }] : [])),
  );
}

export function createGame(def: PuzzleDefinition): GameState {
  const board = createBoard(def.board);
  return {
    board,
    robot: { ...def.start },
    starsLeft: countStars(board),
    stack: [{ fn: 0, pc: 0 }],
    steps: 0,
    status: "running",
    failure: null,
    current: null,
  };
}

function bodyLength(program: CompiledProgram, fn: number): number {
  return program[fn]?.length ?? 0;
}

/** 最後まで読み終えた関数をスタックから取り除く */
function unwind(stack: Frame[], program: CompiledProgram): void {
  for (let top = stack.at(-1); top; top = stack.at(-1)) {
    if (top.pc < bodyLength(program, top.fn)) return;
    stack.pop();
  }
}

function updateTile(board: Board, x: number, y: number, tile: Tile): Board {
  const cells = [...board.cells];
  cells[y * board.width + x] = tile;
  return { ...board, cells };
}

const PAINT_COLOR: Record<string, Color> = {
  paintRed: "red",
  paintGreen: "green",
  paintBlue: "blue",
};

function callTarget(op: CallOp): number {
  return Number(op.slice("call".length)) - 1;
}

/**
 * 命令を 1 つ実行した次の状態を返す。
 * 条件が合わない命令は実行せずに読み飛ばし、実行できる命令が見つかるまで進める。
 */
export function step(
  state: GameState,
  program: CompiledProgram,
  limits: Limits = DEFAULT_LIMITS,
): GameState {
  if (state.status !== "running") return state;

  const stack = state.stack.map((frame) => ({ ...frame }));
  let { board, robot, starsLeft } = state;

  for (;;) {
    unwind(stack, program);
    const top = stack.at(-1);
    if (!top) {
      return { ...state, stack, status: "lost", failure: "outOfInstructions", current: null };
    }
    const entry = program[top.fn]?.[top.pc];
    top.pc += 1;
    if (!entry) continue;

    const { instruction, slot } = entry;
    const here = cellAt(board, robot.x, robot.y);
    if (instruction.cond !== null && instruction.cond !== here?.color) continue;

    const current: SlotRef = { fn: top.fn, slot };
    const steps = state.steps + 1;
    let status: Status = "running";
    let failure: FailureReason | null = null;
    const { op } = instruction;

    if (op === "forward") {
      const { dx, dy } = delta(robot.direction);
      robot = { ...robot, x: robot.x + dx, y: robot.y + dy };
      const tile = cellAt(board, robot.x, robot.y);
      if (!tile) {
        status = "lost";
        failure = "fell";
      } else if (tile.star) {
        board = updateTile(board, robot.x, robot.y, { ...tile, star: false });
        starsLeft -= 1;
        if (starsLeft === 0) status = "won";
      }
    } else if (op === "turnLeft") {
      robot = { ...robot, direction: turnLeft(robot.direction) };
    } else if (op === "turnRight") {
      robot = { ...robot, direction: turnRight(robot.direction) };
    } else if (op.startsWith("paint")) {
      const color = PAINT_COLOR[op];
      if (here && color) board = updateTile(board, robot.x, robot.y, { ...here, color });
    } else {
      // 呼び出し元の残りがなければ先に片付ける(末尾呼び出しでスタックが伸びない)
      unwind(stack, program);
      stack.push({ fn: callTarget(op as CallOp), pc: 0 });
      if (stack.length > limits.maxStackDepth) {
        status = "lost";
        failure = "stackOverflow";
      }
    }

    if (status === "running") {
      unwind(stack, program);
      if (stack.length === 0) {
        status = "lost";
        failure = "outOfInstructions";
      } else if (steps >= limits.maxSteps) {
        status = "lost";
        failure = "stepLimit";
      }
    }

    return { board, robot, starsLeft, stack, steps, status, failure, current };
  }
}

/** 決着がつくまで実行した最終状態を返す */
export function runToEnd(
  def: PuzzleDefinition,
  program: Program,
  limits: Limits = DEFAULT_LIMITS,
): GameState {
  const compiled = compileProgram(program);
  let state = createGame(def);
  while (state.status === "running") {
    state = step(state, compiled, limits);
  }
  return state;
}
