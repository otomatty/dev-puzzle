import type { Program, PuzzleDefinition } from "../engine";

/** API のレスポンス型。Worker とクライアントで共有する */

export interface PuzzleSummary {
  id: string;
  title: string;
  difficulty: number;
  /** クリア報告の数 */
  solves: number;
  /** 一覧のサムネイルにも使うので一覧にも含める */
  definition: PuzzleDefinition;
}

export interface PuzzleDetail extends PuzzleSummary {
  hint: string;
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

/** ログイン中のユーザー */
export interface User {
  id: string;
  name: string;
  email: string;
  /** プロフィール画像の URL。Google 側で設定されていなければ null */
  picture: string | null;
}

export interface MeResponse {
  /** ログインしていなければ null */
  user: User | null;
}

export interface ErrorResponse {
  error: string;
}
