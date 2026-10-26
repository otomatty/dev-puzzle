import { parsePuzzleDefinition } from "../engine";
import type { PuzzleDetail, PuzzleSummary } from "../shared/api";

interface SummaryRow {
  id: string;
  title: string;
  difficulty: number;
  solves: number;
  definition: string;
}

interface DetailRow extends SummaryRow {
  hint: string;
  next_id: string | null;
}

function toSummary(row: SummaryRow): PuzzleSummary {
  return {
    id: row.id,
    title: row.title,
    difficulty: row.difficulty,
    solves: row.solves,
    // DB の中身も信用せず検証する(壊れた定義はここで例外になり 500 を返す)
    definition: parsePuzzleDefinition(JSON.parse(row.definition)),
  };
}

export async function listPuzzles(db: D1Database): Promise<PuzzleSummary[]> {
  const { results } = await db
    .prepare("SELECT id, title, difficulty, solves, definition FROM puzzles ORDER BY sort_order")
    .run<SummaryRow>();
  return results.map(toSummary);
}

export async function findPuzzle(db: D1Database, id: string): Promise<PuzzleDetail | null> {
  const row = await db
    .prepare(
      `SELECT p.id, p.title, p.difficulty, p.solves, p.hint, p.definition,
         (SELECT n.id FROM puzzles n WHERE n.sort_order > p.sort_order ORDER BY n.sort_order LIMIT 1) AS next_id
       FROM puzzles p WHERE p.id = ?`,
    )
    .bind(id)
    .first<DetailRow>();
  if (!row) return null;
  return { ...toSummary(row), hint: row.hint, nextId: row.next_id };
}

/** クリア人数を 1 増やし、増やした後の値を返す */
export async function incrementSolves(db: D1Database, id: string): Promise<number | null> {
  const row = await db
    .prepare("UPDATE puzzles SET solves = solves + 1 WHERE id = ? RETURNING solves")
    .bind(id)
    .first<{ solves: number }>();
  return row?.solves ?? null;
}
