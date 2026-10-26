import type { Program, PuzzleDefinition } from "../engine";

/** API のレスポンス型。Worker とクライアントで共有する */

export interface PuzzleSummary {
  id: string;
  title: string;
  difficulty: number;
  /** クリア報告の数 */
  solves: number;
}

export interface PuzzleDetail extends PuzzleSummary {
  hint: string;
  definition: PuzzleDefinition;
  /** 次のステージの ID。最後のステージなら null */
  nextId: string | null;
}

export interface PuzzleListResponse {
  puzzles: PuzzleSummary[];
}

export interface PuzzleResponse {
  puzzle: PuzzleDetail;
}

export interface ClearRequest {
  program: Program;
}

export interface ClearResponse {
  solves: number;
}

export interface ErrorResponse {
  error: string;
}
