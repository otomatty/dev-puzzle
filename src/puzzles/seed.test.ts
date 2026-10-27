import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CATALOG } from "./catalog";
import { buildSeedSql } from "./seed";

describe("buildSeedSql", () => {
  it("シングルクォートをエスケープする", () => {
    const sql = buildSeedSql([
      {
        id: "quote",
        title: "It's",
        difficulty: 1,
        hint: "",
        definition: {
          board: ["bB"],
          start: { x: 0, y: 0, direction: "right" },
          functions: [1],
          paints: [],
        },
      },
    ]);
    expect(sql).toContain("'It''s'");
  });

  it("seeds/0001_puzzles.sql が catalog.ts と一致している(`bun run db:generate-seed` で更新)", () => {
    const file = readFileSync(new URL("../../seeds/0001_puzzles.sql", import.meta.url), "utf8");
    expect(file).toBe(buildSeedSql(CATALOG));
  });
});
