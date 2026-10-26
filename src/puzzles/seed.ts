import type { CatalogPuzzle } from "./catalog";

function quote(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

/**
 * 内蔵ステージを D1 に登録する SQL を作る。
 * 何度流しても同じ結果になるよう upsert にしており、クリア人数(solves)は保持される。
 */
export function buildSeedSql(catalog: readonly CatalogPuzzle[]): string {
  const rows = catalog.map((puzzle, index) =>
    [
      quote(puzzle.id),
      quote(puzzle.title),
      String(puzzle.difficulty),
      String(index + 1),
      quote(puzzle.hint),
      quote(JSON.stringify(puzzle.definition)),
    ].join(", "),
  );

  return [
    "-- このファイルは `pnpm db:generate-seed` で src/puzzles/catalog.ts から生成しています。直接編集しないでください。",
    "INSERT INTO puzzles (id, title, difficulty, sort_order, hint, definition) VALUES",
    rows.map((row) => `  (${row})`).join(",\n"),
    "ON CONFLICT (id) DO UPDATE SET",
    "  title = excluded.title,",
    "  difficulty = excluded.difficulty,",
    "  sort_order = excluded.sort_order,",
    "  hint = excluded.hint,",
    "  definition = excluded.definition,",
    "  updated_at = CURRENT_TIMESTAMP;",
    "",
  ].join("\n");
}
