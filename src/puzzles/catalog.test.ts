import { describe, expect, it } from "vitest";
import { parseNotation, parseProgram, parsePuzzleDefinition, runToEnd } from "../engine";
import { CATALOG } from "./catalog";

/**
 * 各ステージの模範解答。クライアントには配信しないためテストにだけ置く。
 * 解けることを保証するもので、最短である必要はない。
 */
const SOLUTIONS: Record<string, string[]> = {
  "first-steps": ["F F F F"],
  corners: ["F F R F F L F"],
  repeat: ["F f1"],
  staircase: ["F L F R f1"],
  "red-corners": ["F r:R f1"],
  "red-and-green": ["F r:R g:L f1"],
  comb: ["F L f2 L F f1", "F F L L F F"],
  crossroads: ["F r:f2 g:R f1", "R R"],
  snake: ["F g:f2 r:f3 f1", "R F R", "L F L"],
  "square-wave": ["f2 f3 f3 f2 f1", "F F R", "F F L"],
  "leave-a-mark": ["pg f2", "F r:R r:R g:L f2"],
  "second-time": ["F r:R g:f2 f1", "pb R"],
  "way-back": ["f3 R F", "L L", "F r:f2 b:f3 F"],
  "copy-distance": ["f2 L F", "F b:f2 g:R F"],
};

describe("内蔵ステージ", () => {
  it("ID が重複していない", () => {
    const ids = CATALOG.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("ID は URL に使える形式", () => {
    for (const { id } of CATALOG) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("すべてのステージに模範解答がある", () => {
    expect(Object.keys(SOLUTIONS).sort()).toEqual(CATALOG.map((p) => p.id).sort());
  });

  describe.each(CATALOG.map((p) => [p.title, p] as const))("%s", (_, puzzle) => {
    it("定義が正しい", () => {
      expect(parsePuzzleDefinition(puzzle.definition)).toEqual(puzzle.definition);
    });

    it("模範解答でクリアできる", () => {
      const program = parseNotation(SOLUTIONS[puzzle.id] ?? [], puzzle.definition);
      expect(parseProgram(program, puzzle.definition)).toEqual({ ok: true, program });
      const end = runToEnd(puzzle.definition, program);
      expect(end.failure).toBeNull();
      expect(end.status).toBe("won");
    });
  });
});
