-- 内蔵ステージ。中身は seeds/ の SQL で登録する
CREATE TABLE puzzles (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  difficulty INTEGER NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
  sort_order INTEGER NOT NULL,
  hint TEXT NOT NULL DEFAULT '',
  -- PuzzleDefinition の JSON
  definition TEXT NOT NULL CHECK (json_valid(definition)),
  -- サーバー側で検証済みのクリア報告の数
  solves INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_puzzles_sort_order ON puzzles (sort_order);
