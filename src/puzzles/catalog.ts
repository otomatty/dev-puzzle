import type { PuzzleDefinition } from "../engine";

export type Difficulty = 1 | 2 | 3 | 4 | 5;

export interface CatalogPuzzle {
  /** URL に使う ID。公開後は変えない */
  id: string;
  title: string;
  difficulty: Difficulty;
  hint: string;
  definition: PuzzleDefinition;
}

/**
 * 内蔵ステージ。並び順がそのまま一覧の順番になる。
 * 変更したら `pnpm db:seed` で D1 のシード用マイグレーションを作り直すこと。
 */
export const CATALOG: readonly CatalogPuzzle[] = [
  {
    id: "first-steps",
    title: "まっすぐ進もう",
    difficulty: 1,
    hint: "前進を並べて、星まで進みましょう。",
    definition: {
      board: ["bbbbB"],
      start: { x: 0, y: 0, direction: "right" },
      functions: [5],
      paints: [],
    },
  },
  {
    id: "corners",
    title: "曲がり角",
    difficulty: 1,
    hint: "右回転・左回転はその場で向きだけを変えます。",
    definition: {
      board: ["bbb.", "..b.", "..bB"],
      start: { x: 0, y: 0, direction: "right" },
      functions: [8],
      paints: [],
    },
  },
  {
    id: "repeat",
    title: "くりかえし",
    difficulty: 1,
    hint: "F1 の中で F1 を呼ぶと、同じ命令を何度でもくり返せます。",
    definition: {
      board: ["bBbBbBbBbBbB"],
      start: { x: 0, y: 0, direction: "right" },
      functions: [2],
      paints: [],
    },
  },
  {
    id: "staircase",
    title: "階段",
    difficulty: 2,
    hint: "1 段分の動きを書いてから、くり返しましょう。",
    definition: {
      board: ["b.....", "bB....", ".bB...", "..bB..", "...bB.", "....bB"],
      start: { x: 0, y: 0, direction: "down" },
      functions: [5],
      paints: [],
    },
  },
  {
    id: "red-corners",
    title: "赤い角で曲がれ",
    difficulty: 2,
    hint: "命令に色を付けると、その色の床にいるときだけ実行されます。",
    definition: {
      board: ["bbBbr", "....b", "rbB.B", "b...b", "rbBbr"],
      start: { x: 0, y: 0, direction: "right" },
      functions: [3],
      paints: [],
    },
  },
  {
    id: "red-and-green",
    title: "赤は右、緑は左",
    difficulty: 2,
    hint: "条件付きの命令は 1 つの関数にいくつでも並べられます。",
    definition: {
      board: ["..rbr..", "..B.B..", "bbg.gbB"],
      start: { x: 0, y: 2, direction: "right" },
      functions: [4],
      paints: [],
    },
  },
  {
    id: "comb",
    title: "関数で分ける",
    difficulty: 2,
    hint: "何度も出てくる動きは F2 にまとめて、F1 から呼びましょう。",
    definition: {
      board: [".B.B.B.", ".b.b.b.", "bbbbbbb"],
      start: { x: 0, y: 2, direction: "right" },
      functions: [6, 6],
      paints: [],
    },
  },
  {
    id: "crossroads",
    title: "十字路",
    difficulty: 3,
    hint: "行き止まりで引き返す動きと、交差点で曲がる動きを分けて考えましょう。",
    definition: {
      board: ["...R...", "...b...", "...b...", "RbbgbbR", "...b...", "...b...", "...R..."],
      start: { x: 3, y: 3, direction: "up" },
      functions: [4, 2],
      paints: [],
    },
  },
  {
    id: "snake",
    title: "ヘビのように",
    difficulty: 3,
    hint: "右端と左端で、折り返し方が左右反対になります。",
    definition: {
      board: ["bbBbg", "rbbBg", "rBbbg", "Bbbbg"],
      start: { x: 0, y: 0, direction: "right" },
      functions: [4, 3, 3],
      paints: [],
    },
  },
  {
    id: "square-wave",
    title: "方形波",
    difficulty: 3,
    hint: "道の形を 2 種類の部品に分けると、少ない命令で書けます。",
    definition: {
      board: ["bbb.Bbb.B", "..b.b.b.b", "..Bbb.Bbb"],
      start: { x: 0, y: 0, direction: "right" },
      functions: [5, 3, 3],
      paints: [],
    },
  },
  {
    id: "leave-a-mark",
    title: "目印を残せ",
    difficulty: 3,
    hint: "ペンキで足元の色を変えておくと、戻ってきたときの目印になります。",
    definition: {
      board: [".R.", ".b.", ".b.", ".b.", ".b.", ".b.", ".bB", ".b.", ".b.", ".b."],
      start: { x: 1, y: 6, direction: "up" },
      functions: [2, 5],
      paints: ["green"],
    },
  },
  {
    id: "second-time",
    title: "一度目と二度目",
    difficulty: 4,
    hint: "同じマスを 2 回通ります。1 回目に通ったときに色を変えておきましょう。",
    definition: {
      board: ["rbbbgbB", "b...b..", "B...b..", "b...b..", "rbBbr.."],
      start: { x: 0, y: 0, direction: "right" },
      functions: [4, 2],
      paints: ["red", "green", "blue"],
    },
  },
  {
    id: "way-back",
    title: "来た道を戻れ",
    difficulty: 4,
    hint: "関数の途中で呼んだ関数が終わると、呼び出し元の残りの命令が実行されます。",
    definition: {
      board: ["....B.....", "bbbbbbbbbR"],
      start: { x: 4, y: 1, direction: "right" },
      functions: [3, 2, 4],
      paints: [],
    },
  },
  {
    id: "copy-distance",
    title: "距離をコピー",
    difficulty: 5,
    hint: "横に進んだのと同じ数だけ下に進めば、星の真横に着きます。",
    definition: {
      board: [
        "bbbbbg.",
        ".....b.",
        ".....b.",
        ".....b.",
        ".....b.",
        ".....bB",
        ".....b.",
        ".....b.",
        ".....b.",
        ".....b.",
      ],
      start: { x: 0, y: 0, direction: "right" },
      functions: [3, 4],
      paints: [],
    },
  },
];
